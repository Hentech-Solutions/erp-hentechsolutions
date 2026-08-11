-- ============================================================
-- Pedidos originados de lead (formulario da landing page).
--
-- Antes: /api/public/orders exigia plan {id,name,price} e summary.total.
-- Um lead que so preencheu "nome, email, telefone, mensagem" nao tinha como
-- entrar no kanban sem inventar um plano de R$ 0 — o que sujaria ticket medio,
-- margem por plano e o funil com receita fantasma.
--
-- Agora: `origin` distingue a procedencia e plano/valor sao anulaveis, mas
-- SOMENTE para origin = 'lead'. Pedido vindo do site continua obrigado a
-- trazer plano e total, igual antes desta migration.
-- ============================================================

-- ------------------------------------------------------------
-- Procedencia do pedido
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_origin') THEN
    CREATE TYPE public.order_origin AS ENUM ('site', 'lead', 'manual');
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin public.order_origin NOT NULL DEFAULT 'site';

COMMENT ON COLUMN public.orders.origin IS
  'site = pedido fechado com plano e valor; lead = contato da landing page, valor definido no atendimento; manual = lancado a mao no ERP.';

-- ------------------------------------------------------------
-- Plano e valor passam a ser anulaveis
-- ------------------------------------------------------------
ALTER TABLE public.orders ALTER COLUMN plan_id    DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN plan_name  DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN plan_price DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN total      DROP NOT NULL;

-- A garantia antiga sobrevive onde importa: quem nao e lead precisa de plano
-- e total. Um lead pode nascer sem nenhum dos dois e ganhar valor depois,
-- dentro do ERP, sem precisar trocar a origem.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_priced_unless_lead;
ALTER TABLE public.orders ADD CONSTRAINT orders_priced_unless_lead CHECK (
  origin = 'lead'
  OR (plan_id IS NOT NULL AND plan_name IS NOT NULL
      AND plan_price IS NOT NULL AND total IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS orders_origin_idx
  ON public.orders(origin) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Faturar exige valor: falha explicita em vez de erro de NOT NULL
-- ------------------------------------------------------------
-- register_order_sale inseria o.total direto em sales.total_amount. Com total
-- anulavel, um lead sem valor quebraria com "null value violates not-null
-- constraint" — mensagem inutil para quem clicou "registrar venda".
CREATE OR REPLACE FUNCTION public.register_order_sale(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o           public.orders;
  pl          public.plans;
  v_ref       text;
  v_sale      uuid;
  v_entry     uuid;
  v_customer  uuid;
  v_cat       uuid;
  v_date      date;
  v_plan_cost numeric := 0;
  v_add_cost  numeric := 0;
  v_total_cost numeric := 0;
  v_settled   boolean;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'pedido nao encontrado'; END IF;

  IF o.total IS NULL THEN
    RAISE EXCEPTION 'pedido % nao tem valor definido: informe plano e valor antes de registrar a venda', o.code
      USING ERRCODE = 'check_violation';
  END IF;

  v_ref := 'order:' || o.id;

  -- idempotente
  IF EXISTS (SELECT 1 FROM public.financial_entries
              WHERE external_ref = v_ref AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('status','skipped');
  END IF;

  -- competencia = data do pedido, nao a data do clique
  v_date := COALESCE(o.order_created_at::date, CURRENT_DATE);

  pl := public.resolve_order_plan(o);
  IF pl.id IS NOT NULL THEN
    v_plan_cost := pl.unit_cost;
    v_add_cost  := pl.add_unit_cost;
  END IF;
  v_total_cost := v_plan_cost + (v_add_cost * COALESCE(o.add_quantity, 0));

  -- receita so nasce liquidada se o pagamento ja foi confirmado
  v_settled := (o.payment_status = 'pago');

  -- cliente no CRM
  IF o.customer_email IS NOT NULL AND btrim(o.customer_email) <> '' THEN
    SELECT id INTO v_customer FROM public.customers
     WHERE lower(email) = lower(btrim(o.customer_email)) AND deleted_at IS NULL
     LIMIT 1;
    IF v_customer IS NULL THEN
      INSERT INTO public.customers (name, email, phone, person_type, notes)
      VALUES (o.customer_name, lower(btrim(o.customer_email)), o.customer_whatsapp,
              (CASE WHEN o.customer_company IS NOT NULL THEN 'company' ELSE 'individual' END)::public.person_type,
              NULLIF(concat_ws(' — ', o.customer_company, o.customer_role), ''))
      RETURNING id INTO v_customer;
    END IF;
  END IF;

  SELECT id INTO v_cat FROM public.financial_categories WHERE slug = 'venda_produto' LIMIT 1;
  IF v_cat IS NULL THEN RAISE EXCEPTION 'categoria de sistema "venda_produto" ausente'; END IF;

  INSERT INTO public.sales (sale_date, total_amount, total_cost, discount, notes, external_ref, customer_id)
  VALUES (v_date, o.total, v_total_cost, 0,
          format('Pedido %s — %s (%s)', o.code,
                 COALESCE(o.plan_name, 'servico sob medida'), o.customer_name),
          v_ref, v_customer)
  RETURNING id INTO v_sale;

  -- itens: alimentam o CMV do DRE (get_dre le custo de sale_items)
  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount, product_snapshot)
  VALUES (v_sale, NULL, 1, COALESCE(o.plan_price, o.total), v_plan_cost, 0,
          jsonb_build_object('name', COALESCE(o.plan_name, 'Servico sob medida'),
                             'plan_code', o.plan_id,
                             'price', COALESCE(o.plan_price, o.total), 'cost', v_plan_cost));

  IF COALESCE(o.add_quantity, 0) > 0 THEN
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount, product_snapshot)
    VALUES (v_sale, NULL, o.add_quantity, o.add_unit_price, v_add_cost, COALESCE(o.add_saving, 0),
            jsonb_build_object('name', COALESCE(o.plan_name, 'Servico sob medida') || ' — adicionais',
                               'price', o.add_unit_price, 'cost', v_add_cost));
  END IF;

  INSERT INTO public.financial_entries (
    type, amount, category_id, reference_date, due_date, description, notes,
    recurrence, cash_flow_cat, external_ref, sale_id, customer_id,
    is_settled, payment_date
  )
  VALUES (
    'revenue', o.total, v_cat, v_date, COALESCE(o.due_date, v_date),
    format('Pedido %s — %s', o.code, COALESCE(o.plan_name, 'servico sob medida')),
    format('Cliente: %s', o.customer_name),
    'one_time', 'operational', v_ref, v_sale, v_customer,
    v_settled, CASE WHEN v_settled THEN COALESCE(o.paid_at::date, v_date) END
  )
  RETURNING id INTO v_entry;

  UPDATE public.orders SET plan_ref_id = COALESCE(plan_ref_id, pl.id) WHERE id = o.id;

  RETURN jsonb_build_object(
    'status','created', 'sale_id', v_sale, 'entry_id', v_entry,
    'total_cost', v_total_cost, 'settled', v_settled,
    'plan_matched', pl.id IS NOT NULL
  );
END $$;

REVOKE ALL ON FUNCTION public.register_order_sale(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_order_sale(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Desempenho por plano: lead sem plano nao vira grupo NULL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_plan_performance(_from DATE, _to DATE)
RETURNS TABLE (
  plan_name TEXT, orders_count BIGINT, revenue NUMERIC,
  cost NUMERIC, profit NUMERIC, margin NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(p.name, o.plan_name, 'Sem plano definido') AS plan_name,
         COUNT(*) AS orders_count,
         COALESCE(SUM(o.total), 0) AS revenue,
         SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity) AS cost,
         COALESCE(SUM(o.total), 0) - SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity) AS profit,
         CASE WHEN COALESCE(SUM(o.total), 0) > 0
              THEN ROUND((COALESCE(SUM(o.total), 0) - SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity))
                         * 100 / SUM(o.total), 1)
              ELSE 0 END AS margin
    FROM public.orders o
    LEFT JOIN public.plans p
           ON p.deleted_at IS NULL
          AND (p.id = o.plan_ref_id OR p.code = o.plan_id OR p.name = o.plan_name)
   WHERE o.deleted_at IS NULL
     AND o.status = 'concluido'
     AND o.order_created_at::date BETWEEN _from AND _to
   GROUP BY 1
   ORDER BY revenue DESC;
$$;
