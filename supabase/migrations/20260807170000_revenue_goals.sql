-- ============================================================
-- Metas de faturamento que se alimentam sozinhas.
--
-- Antes so existiam dois tipos de meta:
--   - vinculada a produto: somava sale_items automaticamente
--   - sem vinculo: exigia digitar cada venda em sales_entries na mao
-- Nao havia como dizer "quero faturar R$ 50 mil em agosto" e o sistema
-- acompanhar a receita real do Centro Financeiro.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.goal_type AS ENUM ('revenue', 'product', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sales_goals
  ADD COLUMN IF NOT EXISTS goal_type public.goal_type NOT NULL DEFAULT 'manual';

-- backfill do que ja existe
UPDATE public.sales_goals
   -- cast explicito: o CASE devolve text e a coluna e enum
   SET goal_type = (CASE WHEN product_id IS NOT NULL THEN 'product' ELSE 'manual' END)::public.goal_type
 WHERE goal_type = 'manual';

CREATE INDEX IF NOT EXISTS sales_goals_type_period_idx
  ON public.sales_goals(goal_type, start_date, end_date);

-- a unicidade por produto so faz sentido para metas de produto
DROP INDEX IF EXISTS public.sales_goals_product_unique;
CREATE UNIQUE INDEX sales_goals_product_unique
  ON public.sales_goals(product_id)
  WHERE product_id IS NOT NULL AND goal_type = 'product';

-- ------------------------------------------------------------
-- recalculo passa a conhecer o tipo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_goal_realized(_goal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g     RECORD;
  total numeric;
BEGIN
  SELECT id, product_id, goal_start_date, goal_type, start_date, end_date
    INTO g FROM public.sales_goals WHERE id = _goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF g.goal_type = 'revenue' THEN
    -- faturamento por competencia: toda receita do periodo da meta, venha de
    -- pedido, venda avulsa ou lancamento manual no Centro Financeiro
    SELECT COALESCE(SUM(amount), 0) INTO total
      FROM public.financial_entries
     WHERE type = 'revenue'
       AND deleted_at IS NULL
       AND reference_date BETWEEN g.start_date AND g.end_date;

  ELSIF g.product_id IS NOT NULL THEN
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

-- ------------------------------------------------------------
-- toda receita lancada realimenta as metas de faturamento do periodo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_revenue_goals_for_date(_d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid;
BEGIN
  IF _d IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT id FROM public.sales_goals
     WHERE goal_type = 'revenue' AND _d BETWEEN start_date AND end_date
  LOOP
    PERFORM public.recalc_goal_realized(r);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.recalc_revenue_goals_for_date(date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.financial_entries_goal_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.type = 'revenue' THEN
    PERFORM public.recalc_revenue_goals_for_date(NEW.reference_date);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.type = 'revenue' THEN
    PERFORM public.recalc_revenue_goals_for_date(OLD.reference_date);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.financial_entries_goal_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fe_recalc_goals ON public.financial_entries;
CREATE TRIGGER trg_fe_recalc_goals
AFTER INSERT OR UPDATE OR DELETE ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.financial_entries_goal_trigger();

-- ------------------------------------------------------------
-- serie meta x realizado, ciente do tipo de meta
-- ------------------------------------------------------------
-- getGoalVsRealSeries() lia so sales_entries, entao uma meta de faturamento
-- apareceria zerada no grafico do dashboard mesmo com o card cheio.
CREATE OR REPLACE FUNCTION public.get_goal_vs_real_series(
  _period_type public.goal_period_type,
  _months      int DEFAULT 6
)
RETURNS TABLE (month date, meta numeric, real_value numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH months AS (
    SELECT generate_series(
             date_trunc('month', CURRENT_DATE) - ((_months - 1) || ' months')::interval,
             date_trunc('month', CURRENT_DATE),
             interval '1 month'
           )::date AS m
  ),
  goals AS (
    SELECT * FROM public.sales_goals WHERE period_type = _period_type
  ),
  -- alvo distribuido igualmente entre os meses que a meta cobre na janela
  meta_por_mes AS (
    SELECT m.m,
           COALESCE(SUM(g.target_value / GREATEST(spans.n, 1)), 0) AS meta
      FROM months m
      LEFT JOIN goals g
             ON g.start_date <= (m.m + interval '1 month' - interval '1 day')::date
            AND g.end_date   >= m.m
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS n FROM months m2
         WHERE g.start_date <= (m2.m + interval '1 month' - interval '1 day')::date
           AND g.end_date   >= m2.m
      ) spans ON true
     GROUP BY m.m
  ),
  real_por_mes AS (
    SELECT m.m,
           COALESCE((
             -- metas de faturamento: receita real do mes
             SELECT SUM(fe.amount) FROM public.financial_entries fe
              WHERE fe.type = 'revenue' AND fe.deleted_at IS NULL
                AND fe.reference_date >= m.m
                AND fe.reference_date < (m.m + interval '1 month')::date
                AND EXISTS (SELECT 1 FROM goals g WHERE g.goal_type = 'revenue')
           ), 0)
         + COALESCE((
             -- metas manuais e de produto: lancamentos vinculados
             SELECT SUM(se.amount) FROM public.sales_entries se
              JOIN goals g ON g.id = se.goal_id
              WHERE g.goal_type <> 'revenue'
                AND se.sale_date >= m.m
                AND se.sale_date < (m.m + interval '1 month')::date
           ), 0) AS real_value
      FROM months m
  )
  SELECT mm.m, mm.meta, rm.real_value
    FROM meta_por_mes mm
    JOIN real_por_mes rm ON rm.m = mm.m
   ORDER BY mm.m;
$$;
REVOKE ALL ON FUNCTION public.get_goal_vs_real_series(public.goal_period_type, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_goal_vs_real_series(public.goal_period_type, int) TO authenticated;

-- recalcula tudo com a logica nova
DO $$
DECLARE r uuid;
BEGIN
  FOR r IN SELECT id FROM public.sales_goals LOOP
    PERFORM public.recalc_goal_realized(r);
  END LOOP;
END $$;
