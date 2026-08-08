-- ============================================================
-- Agregacao no Postgres.
-- Antes o dashboard baixava as linhas cruas e somava no browser -- o PostgREST
-- corta em 1000 linhas SEM erro, entao os numeros passariam a encolher
-- silenciosamente conforme a base cresce.
-- ============================================================

-- ------------------------------------------------------------
-- KPIs do dashboard
-- ------------------------------------------------------------
-- Correcao do card "Caixa": era calculado DENTRO do periodo selecionado,
-- entao escolher "7 dias" mostrava a movimentacao da semana rotulada como
-- "capital disponivel". Agora e acumulado desde sempre ate a data de corte,
-- e a data de corte nunca passa de hoje (nao existe caixa realizado no futuro
-- -- a base tem R$ 1,58 mi de despesas com competencia ate 2029).
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_days   INT  := GREATEST((_to - _from) + 1, 1);
  p_from   DATE := _from - v_days;
  p_to     DATE := _from - 1;
  v_as_of  DATE := LEAST(_to, CURRENT_DATE);
  cur      RECORD;
  prv      RECORD;
  v_cash   NUMERIC;
  v_sales  INT;
  v_margin NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS revenue,
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
    INTO cur
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date BETWEEN _from AND _to;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS revenue,
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
    INTO prv
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(
           CASE WHEN type IN ('revenue','capital_in','investment') THEN amount
                WHEN type IN ('expense','withdrawal')              THEN -amount
                ELSE 0 END), 0)
    INTO v_cash
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date <= v_as_of;

  -- vendas = eventos de venda reais, nao linhas de lancamento
  SELECT COUNT(*) INTO v_sales
    FROM public.sales
   WHERE deleted_at IS NULL AND sale_date BETWEEN _from AND _to;

  SELECT COALESCE(AVG(margin), 0) INTO v_margin
    FROM public.products
   WHERE status = 'active' AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'revenue',      cur.revenue,
    'prev_revenue', prv.revenue,
    'expense',      cur.expense,
    'prev_expense', prv.expense,
    'profit',       cur.revenue - cur.expense,
    'prev_profit',  prv.revenue - prv.expense,
    'cash',         v_cash,
    'cash_as_of',   v_as_of,
    'sales_count',  v_sales,
    'ticket',       CASE WHEN v_sales > 0 THEN cur.revenue / v_sales ELSE 0 END,
    'avg_margin',   v_margin
  );
END $$;

-- ------------------------------------------------------------
-- Series mensais (faturamento e fluxo de caixa) em uma so query
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_series(_from DATE, _to DATE)
RETURNS TABLE (
  month     DATE,
  revenue   NUMERIC,
  expense   NUMERIC,
  cash_in   NUMERIC,
  cash_out  NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT m::date AS month,
         COALESCE(SUM(fe.amount) FILTER (WHERE fe.type = 'revenue'), 0),
         COALESCE(SUM(fe.amount) FILTER (WHERE fe.type = 'expense'), 0),
         COALESCE(SUM(fe.amount) FILTER (WHERE fe.type IN ('revenue','capital_in','investment')), 0),
         COALESCE(SUM(fe.amount) FILTER (WHERE fe.type IN ('expense','withdrawal')), 0)
    FROM generate_series(date_trunc('month', _from), date_trunc('month', _to), interval '1 month') m
    LEFT JOIN public.financial_entries fe
           ON fe.deleted_at IS NULL
          AND fe.reference_date >= m
          AND fe.reference_date < m + interval '1 month'
          AND fe.reference_date BETWEEN _from AND _to
   GROUP BY m
   ORDER BY m;
$$;

-- ------------------------------------------------------------
-- Despesas por categoria
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_expense_breakdown(_from DATE, _to DATE)
RETURNS TABLE (name TEXT, color TEXT, amount NUMERIC, percentage NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH agg AS (
    SELECT COALESCE(fc.name, 'Sem categoria')  AS name,
           COALESCE(fc.color, '#6b7280')       AS color,
           SUM(fe.amount)                      AS amount
      FROM public.financial_entries fe
      LEFT JOIN public.financial_categories fc ON fc.id = fe.category_id
     WHERE fe.deleted_at IS NULL
       AND fe.type = 'expense'
       AND fe.reference_date BETWEEN _from AND _to
     GROUP BY 1, 2
  )
  SELECT name, color, amount,
         CASE WHEN SUM(amount) OVER () > 0
              THEN ROUND(amount * 100 / SUM(amount) OVER (), 2)
              ELSE 0 END
    FROM agg
   ORDER BY amount DESC
   LIMIT 5;
$$;

-- ------------------------------------------------------------
-- DRE com CMV de verdade
-- ------------------------------------------------------------
-- getProfitBreakdown() tratava lucro_bruto = receita, ignorando o custo dos
-- produtos vendidos, mesmo com sale_items.unit_cost preenchido.
CREATE OR REPLACE FUNCTION public.get_dre(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_revenue   NUMERIC;
  v_discount  NUMERIC;
  v_cogs      NUMERIC;
  v_expense   NUMERIC;
  v_by_cat    JSONB;
  v_gross     NUMERIC;
  v_operating NUMERIC;
  v_net       NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0),
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
    INTO v_revenue, v_expense
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date BETWEEN _from AND _to;

  -- separado de proposito: juntar sales com sale_items e somar s.discount
  -- multiplicaria o desconto pelo numero de itens da venda
  SELECT COALESCE(SUM(discount), 0)
    INTO v_discount
    FROM public.sales
   WHERE deleted_at IS NULL AND sale_date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0)
    INTO v_cogs
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
   WHERE s.deleted_at IS NULL AND s.sale_date BETWEEN _from AND _to;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'name', name, 'color', color, 'amount', amount) ORDER BY amount DESC), '[]'::jsonb)
    INTO v_by_cat
    FROM (
      SELECT COALESCE(fc.name, 'Sem categoria') AS name,
             COALESCE(fc.color, '#6b7280')      AS color,
             SUM(fe.amount)                     AS amount
        FROM public.financial_entries fe
        LEFT JOIN public.financial_categories fc ON fc.id = fe.category_id
       WHERE fe.deleted_at IS NULL
         AND fe.type = 'expense'
         AND fe.reference_date BETWEEN _from AND _to
       GROUP BY 1, 2
    ) q;

  v_gross     := v_revenue - v_cogs;
  v_operating := v_gross - v_expense;
  v_net       := v_operating;

  RETURN jsonb_build_object(
    'revenue',            v_revenue,
    'discounts',          v_discount,
    'cogs',               v_cogs,
    'gross_profit',       v_gross,
    'operating_expenses', v_expense,
    'expenses_by_category', v_by_cat,
    'operating_profit',   v_operating,
    'net_profit',         v_net,
    'gross_margin',       CASE WHEN v_revenue > 0 THEN ROUND(v_gross     * 100 / v_revenue, 2) ELSE 0 END,
    'operating_margin',   CASE WHEN v_revenue > 0 THEN ROUND(v_operating * 100 / v_revenue, 2) ELSE 0 END,
    'net_margin',         CASE WHEN v_revenue > 0 THEN ROUND(v_net       * 100 / v_revenue, 2) ELSE 0 END
  );
END $$;

-- ------------------------------------------------------------
-- Contas a Pagar / a Receber com aging
-- ------------------------------------------------------------
-- is_settled / payment_date / idx_fe_settled ja existiam e nunca foram lidos.
-- A base tem R$ 1.589.944 em aberto, invisivel no sistema hoje.
CREATE OR REPLACE FUNCTION public.get_ap_ar_summary(_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  direction    TEXT,      -- 'receivable' | 'payable'
  bucket       TEXT,      -- 'overdue_60','overdue_31_60','overdue_1_30','due_today','due_1_30','due_31_60','due_60'
  bucket_order INT,
  entry_count  BIGINT,
  total        NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH open_entries AS (
    SELECT CASE WHEN type IN ('revenue','capital_in') THEN 'receivable' ELSE 'payable' END AS direction,
           amount,
           (due_date - _as_of) AS days
      FROM public.financial_entries
     WHERE deleted_at IS NULL
       AND is_settled = false
       AND type IN ('revenue','capital_in','expense','withdrawal')
  )
  SELECT direction,
         CASE
           WHEN days < -60 THEN 'overdue_60'
           WHEN days < -30 THEN 'overdue_31_60'
           WHEN days <   0 THEN 'overdue_1_30'
           WHEN days =   0 THEN 'due_today'
           WHEN days <= 30 THEN 'due_1_30'
           WHEN days <= 60 THEN 'due_31_60'
           ELSE 'due_60'
         END AS bucket,
         CASE
           WHEN days < -60 THEN 1 WHEN days < -30 THEN 2 WHEN days < 0 THEN 3
           WHEN days = 0 THEN 4 WHEN days <= 30 THEN 5 WHEN days <= 60 THEN 6 ELSE 7
         END AS bucket_order,
         COUNT(*),
         SUM(amount)
    FROM open_entries
   GROUP BY 1, 2, 3
   ORDER BY 1, 3;
$$;

-- liquidar / estornar em lote
CREATE OR REPLACE FUNCTION public.settle_entries(_ids UUID[], _payment_date DATE DEFAULT CURRENT_DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;
  UPDATE public.financial_entries
     SET is_settled = true, payment_date = _payment_date
   WHERE id = ANY(_ids) AND deleted_at IS NULL AND is_settled = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.unsettle_entries(_ids UUID[])
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;
  UPDATE public.financial_entries
     SET is_settled = false, payment_date = NULL
   WHERE id = ANY(_ids) AND deleted_at IS NULL AND is_settled = true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ------------------------------------------------------------
-- edicao/cancelamento de serie recorrente
-- ------------------------------------------------------------
-- recurrence_group_id existia e nao era usado: mudar o valor de uma despesa
-- mensal exigia editar as 12 linhas na mao.
CREATE OR REPLACE FUNCTION public.update_recurrence_series(
  _group_id UUID,
  _from     DATE,          -- aplica so as parcelas a partir desta competencia
  _amount   NUMERIC DEFAULT NULL,
  _category_id UUID    DEFAULT NULL,
  _description TEXT    DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;
  UPDATE public.financial_entries
     SET amount      = COALESCE(_amount, amount),
         category_id = COALESCE(_category_id, category_id),
         description = COALESCE(_description, description)
   WHERE recurrence_group_id = _group_id
     AND reference_date >= _from
     AND deleted_at IS NULL
     AND is_settled = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_recurrence_series(_group_id UUID, _from DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permissao negada: requer admin ou manager';
  END IF;
  UPDATE public.financial_entries
     SET deleted_at = now()
   WHERE recurrence_group_id = _group_id
     AND reference_date >= _from
     AND deleted_at IS NULL
     AND is_settled = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ------------------------------------------------------------
-- grants
-- ------------------------------------------------------------
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'get_dashboard_kpis(date, date)',
    'get_monthly_series(date, date)',
    'get_expense_breakdown(date, date)',
    'get_dre(date, date)',
    'get_ap_ar_summary(date)',
    'settle_entries(uuid[], date)',
    'unsettle_entries(uuid[])',
    'update_recurrence_series(uuid, date, numeric, uuid, text)',
    'cancel_recurrence_series(uuid, date)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
