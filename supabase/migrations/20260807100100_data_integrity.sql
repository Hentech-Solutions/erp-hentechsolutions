-- ============================================================
-- Integridade: uma venda deixa de sobreviver ao seu lancamento.
-- Hoje softDeleteEntry() marca financial_entries.deleted_at mas deixa
-- sales/sale_items vivos, e v_product_metrics le sale_items sem filtrar
-- nada -> dashboard mostra R$ 0 enquanto a base tem R$ 4.007 em vendas.
-- ============================================================

-- ---------- soft delete tambem em sales e orders ----------
ALTER TABLE public.sales  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sales_alive  ON public.sales(sale_date)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_alive ON public.orders(created_at)   WHERE deleted_at IS NULL;

-- ---------- data de vencimento (base de Contas a Pagar/Receber) ----------
-- reference_date  = competencia (quando o fato economico ocorreu)
-- due_date        = vencimento  (quando o dinheiro entra/sai)
-- payment_date    = liquidacao efetiva
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS due_date DATE;
UPDATE public.financial_entries SET due_date = reference_date WHERE due_date IS NULL;
ALTER TABLE public.financial_entries ALTER COLUMN due_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fe_open_due
  ON public.financial_entries(due_date, type)
  WHERE deleted_at IS NULL AND is_settled = false;

-- ---------- cascata: apagar o lancamento apaga a venda ----------
CREATE OR REPLACE FUNCTION public.fe_cascade_soft_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sale_id IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    UPDATE public.sales
       SET deleted_at = NEW.deleted_at
     WHERE id = NEW.sale_id
       AND deleted_at IS DISTINCT FROM NEW.deleted_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fe_cascade_soft_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fe_cascade_soft_delete ON public.financial_entries;
CREATE TRIGGER trg_fe_cascade_soft_delete
AFTER UPDATE OF deleted_at ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.fe_cascade_soft_delete();

-- ---------- escrita atomica de venda + lancamento ----------
-- Substitui os 3 inserts sequenciais feitos pelo browser em createEntry(),
-- que deixavam venda orfa se a chamada falhasse no meio.
CREATE OR REPLACE FUNCTION public.create_sale_with_entry(
  _reference_date DATE,
  _category_id    UUID,
  _items          JSONB,
  _discount       NUMERIC DEFAULT 0,
  _description    TEXT    DEFAULT NULL,
  _notes          TEXT    DEFAULT NULL,
  _customer_id    UUID    DEFAULT NULL,
  _due_date       DATE    DEFAULT NULL,
  _is_settled     BOOLEAN DEFAULT false
)
RETURNS TABLE (sale_id UUID, entry_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total    NUMERIC := 0;
  v_cost     NUMERIC := 0;
  v_discount NUMERIC;
  v_sale     UUID;
  v_entry    UUID;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'venda sem itens';
  END IF;

  SELECT COALESCE(SUM((i->>'quantity')::numeric * (i->>'unit_price')::numeric), 0),
         COALESCE(SUM((i->>'quantity')::numeric * (i->>'unit_cost')::numeric), 0)
    INTO v_total, v_cost
    FROM jsonb_array_elements(_items) i;

  v_discount := LEAST(GREATEST(COALESCE(_discount, 0), 0), v_total);

  INSERT INTO public.sales (sale_date, total_amount, total_cost, discount, notes, customer_id)
  VALUES (_reference_date, v_total, v_cost, v_discount, _description, _customer_id)
  RETURNING id INTO v_sale;

  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount, product_snapshot)
  SELECT v_sale,
         (i->>'product_id')::uuid,
         (i->>'quantity')::numeric,
         (i->>'unit_price')::numeric,
         (i->>'unit_cost')::numeric,
         0,
         jsonb_build_object('name', i->>'name', 'price', i->>'unit_price', 'cost', i->>'unit_cost')
    FROM jsonb_array_elements(_items) i;

  INSERT INTO public.financial_entries (
    type, amount, category_id, reference_date, due_date, description, notes,
    recurrence, cash_flow_cat, sale_id, customer_id, is_settled, payment_date
  )
  VALUES (
    'revenue', v_total - v_discount, _category_id, _reference_date,
    COALESCE(_due_date, _reference_date), _description, _notes,
    'one_time', 'operational', v_sale, _customer_id, _is_settled,
    CASE WHEN _is_settled THEN _reference_date END
  )
  RETURNING id INTO v_entry;

  RETURN QUERY SELECT v_sale, v_entry;
END $$;

REVOKE ALL ON FUNCTION public.create_sale_with_entry(DATE, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, DATE, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_with_entry(DATE, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, DATE, BOOLEAN) TO authenticated;

-- ---------- slug nas categorias: mata o UUID cravado no codigo ----------
-- src/lib/data/financial.ts tinha VENDA_DE_PRODUTO_CATEGORY_ID = "744eb29b-..."
ALTER TABLE public.financial_categories ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.financial_categories SET slug = v.slug
  FROM (VALUES
    ('Venda de Produto',   'venda_produto'),
    ('Serviço Prestado',   'servico_prestado'),
    ('Outras Receitas',    'outras_receitas'),
    ('Custo Operacional',  'custo_operacional'),
    ('Folha de Pagamento', 'folha_pagamento'),
    ('Marketing',          'marketing'),
    ('Infraestrutura',     'infraestrutura'),
    ('Outras Despesas',    'outras_despesas'),
    ('Aporte Sócio',       'aporte_socio'),
    ('Financiamento',      'financiamento'),
    ('Investimento Ativo', 'investimento_ativo'),
    ('Retirada Sócio',     'retirada_socio')
  ) AS v(name, slug)
 WHERE public.financial_categories.name = v.name
   AND public.financial_categories.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS financial_categories_slug_key
  ON public.financial_categories(slug) WHERE slug IS NOT NULL;

-- ---------- views passam a respeitar o soft delete ----------
DROP VIEW IF EXISTS public.v_product_metrics;
CREATE VIEW public.v_product_metrics AS
SELECT p.id, p.name, p.status, p.price, p.cost, p.margin,
       COALESCE(SUM(li.quantity), 0)                                     AS units_sold,
       COALESCE(SUM(li.subtotal), 0)                                     AS total_revenue,
       COALESCE(SUM(li.unit_cost * li.quantity), 0)                      AS total_cost,
       COALESCE(SUM(li.subtotal) - SUM(li.unit_cost * li.quantity), 0)   AS total_profit,
       MAX(li.sale_date)                                                 AS last_sale_date
  FROM public.products p
  LEFT JOIN (
    -- itens de vendas vivas; junta a data aqui para nao correlacionar
    -- `sales` direto com `products` no join externo
    SELECT si.product_id, si.quantity, si.subtotal, si.unit_cost, s.sale_date
      FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
     WHERE s.deleted_at IS NULL
  ) li ON li.product_id = p.id
 WHERE p.deleted_at IS NULL
 GROUP BY p.id, p.name, p.status, p.price, p.cost, p.margin;
ALTER VIEW public.v_product_metrics SET (security_invoker = true);

-- recalc de metas tambem ignorava vendas deletadas
CREATE OR REPLACE FUNCTION public.recalc_goal_realized(_goal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g     RECORD;
  total numeric;
BEGIN
  SELECT id, product_id, goal_start_date INTO g FROM public.sales_goals WHERE id = _goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF g.product_id IS NOT NULL THEN
    SELECT COALESCE((
             SELECT SUM(amount) FROM public.sales_entries
              WHERE product_id = g.product_id AND sale_date >= g.goal_start_date
           ), 0)
         + COALESCE((
             SELECT SUM(si.quantity * si.unit_price - COALESCE(si.discount, 0))
               FROM public.sale_items si
               JOIN public.sales s ON s.id = si.sale_id
              WHERE si.product_id = g.product_id
                AND s.sale_date >= g.goal_start_date
                AND s.deleted_at IS NULL
           ), 0)
      INTO total;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO total
      FROM public.sales_entries WHERE goal_id = g.id;
  END IF;

  UPDATE public.sales_goals SET realized_value = total WHERE id = g.id;
END $$;
REVOKE ALL ON FUNCTION public.recalc_goal_realized(uuid) FROM PUBLIC, anon, authenticated;

-- ---------- limpeza dos orfaos de teste ----------
-- 7 vendas cujo lancamento ja estava soft-deletado (ou nunca existiu).
-- sale_items cai por ON DELETE CASCADE.
DELETE FROM public.sales s
 WHERE NOT EXISTS (
   SELECT 1 FROM public.financial_entries fe
    WHERE fe.sale_id = s.id AND fe.deleted_at IS NULL
 );
