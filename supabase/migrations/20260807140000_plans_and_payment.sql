-- ============================================================
-- Fase 1: catalogo de planos, custo real e pagamento rastreado.
--
-- Antes:
--   - plan_id/plan_name chegavam do site como texto solto; nao havia catalogo
--   - registerOrderSale gravava total_cost = 0 -> margem de 100% em todo pedido
--   - pedido "concluido" lancava receita com is_settled = true, ou seja, o
--     sistema assumia que entregou = recebeu. Pagamento e PIX manual.
-- ============================================================

-- ------------------------------------------------------------
-- Catalogo de planos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL,              -- casa com orders.plan_id vindo do site
  name           text NOT NULL,
  description    text,
  price          numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  unit_cost      numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  add_unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (add_unit_price >= 0),
  add_unit_cost  numeric(12,2) NOT NULL DEFAULT 0 CHECK (add_unit_cost >= 0),
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS plans_code_unique
  ON public.plans(code) WHERE deleted_at IS NULL;

CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON public.plans FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY plans_insert ON public.plans FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY plans_update ON public.plans FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY plans_delete ON public.plans FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_audit_plans AFTER INSERT OR UPDATE OR DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ------------------------------------------------------------
-- Pagamento separado da execucao
-- ------------------------------------------------------------
-- `status` continua sendo o kanban (entrada -> negociacao -> ... -> concluido).
-- `payment_status` e uma dimensao independente: da pra entregar sem receber.
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM ('aguardando','parcial','pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.order_payment_status NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS paid_amount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  ADD COLUMN IF NOT EXISTS paid_at        timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS due_date       date,
  ADD COLUMN IF NOT EXISTS plan_ref_id    uuid REFERENCES public.plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_payment_status_idx
  ON public.orders(payment_status) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Resolve o plano de um pedido (por FK explicita, senao por code, senao nome)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_order_plan(_order public.orders)
RETURNS public.plans
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.* FROM public.plans p
   WHERE p.deleted_at IS NULL
     AND (p.id = _order.plan_ref_id OR p.code = _order.plan_id OR p.name = _order.plan_name)
   ORDER BY (p.id = _order.plan_ref_id) DESC, (p.code = _order.plan_id) DESC
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_order_plan(public.orders) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_order_plan(public.orders) TO authenticated;

-- ------------------------------------------------------------
-- Registra a venda do pedido: atomico, com custo real e sem presumir pagamento
-- ------------------------------------------------------------
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
              -- cast explicito: o CASE devolve text e a coluna e enum
              (CASE WHEN o.customer_company IS NOT NULL THEN 'company' ELSE 'individual' END)::public.person_type,
              NULLIF(concat_ws(' — ', o.customer_company, o.customer_role), ''))
      RETURNING id INTO v_customer;
    END IF;
  END IF;

  SELECT id INTO v_cat FROM public.financial_categories WHERE slug = 'venda_produto' LIMIT 1;
  IF v_cat IS NULL THEN RAISE EXCEPTION 'categoria de sistema "venda_produto" ausente'; END IF;

  INSERT INTO public.sales (sale_date, total_amount, total_cost, discount, notes, external_ref, customer_id)
  VALUES (v_date, o.total, v_total_cost, 0,
          format('Pedido %s — %s (%s)', o.code, o.plan_name, o.customer_name),
          v_ref, v_customer)
  RETURNING id INTO v_sale;

  -- itens: alimentam o CMV do DRE (get_dre le custo de sale_items)
  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount, product_snapshot)
  VALUES (v_sale, NULL, 1, o.plan_price, v_plan_cost, 0,
          jsonb_build_object('name', o.plan_name, 'plan_code', o.plan_id,
                             'price', o.plan_price, 'cost', v_plan_cost));

  IF COALESCE(o.add_quantity, 0) > 0 THEN
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount, product_snapshot)
    VALUES (v_sale, NULL, o.add_quantity, o.add_unit_price, v_add_cost, COALESCE(o.add_saving, 0),
            jsonb_build_object('name', o.plan_name || ' — adicionais',
                               'price', o.add_unit_price, 'cost', v_add_cost));
  END IF;

  INSERT INTO public.financial_entries (
    type, amount, category_id, reference_date, due_date, description, notes,
    recurrence, cash_flow_cat, external_ref, sale_id, customer_id,
    is_settled, payment_date
  )
  VALUES (
    'revenue', o.total, v_cat, v_date, COALESCE(o.due_date, v_date),
    format('Pedido %s — %s', o.code, o.plan_name),
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
-- Baixa de pagamento do pedido, sincronizada com o financeiro
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_order_payment(
  _order_id uuid,
  _status   public.order_payment_status,
  _amount   numeric DEFAULT NULL,
  _method   text    DEFAULT NULL,
  _paid_at  date    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o        public.orders;
  v_paid   numeric;
  v_when   date := COALESCE(_paid_at, CURRENT_DATE);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'pedido nao encontrado'; END IF;

  v_paid := CASE
    WHEN _status = 'pago'       THEN COALESCE(_amount, o.total)
    WHEN _status = 'aguardando' THEN 0
    ELSE COALESCE(_amount, o.paid_amount)
  END;

  UPDATE public.orders
     SET payment_status = _status,
         paid_amount    = v_paid,
         paid_at        = CASE WHEN _status = 'aguardando' THEN NULL ELSE v_when END,
         payment_method = COALESCE(_method, payment_method)
   WHERE id = _order_id;

  -- espelha no lancamento financeiro, se ja existir
  UPDATE public.financial_entries
     SET is_settled   = (_status = 'pago'),
         payment_date = CASE WHEN _status = 'pago' THEN v_when END
   WHERE external_ref = 'order:' || _order_id
     AND deleted_at IS NULL;

  RETURN jsonb_build_object('status', _status, 'paid_amount', v_paid);
END $$;

REVOKE ALL ON FUNCTION public.set_order_payment(uuid, public.order_payment_status, numeric, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_payment(uuid, public.order_payment_status, numeric, text, date) TO authenticated;

-- ------------------------------------------------------------
-- Sincronia inversa: dar baixa em Contas a Receber marca o pedido como pago
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order uuid;
BEGIN
  IF NEW.external_ref IS NULL OR NEW.external_ref NOT LIKE 'order:%' THEN
    RETURN NEW;
  END IF;
  IF NEW.is_settled IS NOT DISTINCT FROM OLD.is_settled THEN
    RETURN NEW;
  END IF;

  v_order := substring(NEW.external_ref FROM 7)::uuid;

  UPDATE public.orders
     -- cast explicito: o CASE devolve text e a coluna e enum
     SET payment_status = (CASE WHEN NEW.is_settled THEN 'pago' ELSE 'aguardando' END)::public.order_payment_status,
         paid_amount    = CASE WHEN NEW.is_settled THEN total ELSE 0 END,
         paid_at        = CASE WHEN NEW.is_settled THEN COALESCE(NEW.payment_date, CURRENT_DATE) END
   WHERE id = v_order;

  RETURN NEW;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_order_payment_from_entry() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_order_payment ON public.financial_entries;
CREATE TRIGGER trg_sync_order_payment
AFTER UPDATE OF is_settled ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_order_payment_from_entry();

-- ------------------------------------------------------------
-- Divergencia entre o preco que o site mandou e o catalogo do ERP
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_plan_price_mismatches()
RETURNS TABLE (
  order_id uuid, code text, plan_name text,
  site_price numeric, catalog_price numeric, diff numeric, ordered_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT o.id, o.code, o.plan_name, o.plan_price, p.price,
         o.plan_price - p.price, o.order_created_at
    FROM public.orders o
    JOIN public.plans p
      ON p.deleted_at IS NULL
     AND (p.id = o.plan_ref_id OR p.code = o.plan_id OR p.name = o.plan_name)
   WHERE o.deleted_at IS NULL
     AND o.plan_price <> p.price
   ORDER BY o.order_created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_plan_price_mismatches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_price_mismatches() TO authenticated;
