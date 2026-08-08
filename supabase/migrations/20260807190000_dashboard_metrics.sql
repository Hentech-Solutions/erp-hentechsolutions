-- ============================================================
-- Dashboard: corrige incoerencias e adiciona as metricas que faltavam.
--
-- Incoerencias corrigidas aqui:
--   - a linha "Saldo" do grafico acumulava so dentro do periodo, enquanto o
--     KPI Caixa passou a ser acumulado desde sempre -> dois numeros para a
--     mesma coisa. Agora a serie carrega o saldo de abertura.
--   - ticket medio dividia receita total (inclui servico, outras receitas)
--     pelo numero de vendas -> agora usa so a receita de vendas.
--   - margem media era media aritmetica de products.margin, sem ponderar por
--     volume e lendo uma tabela que hoje esta vazia -> agora e a margem bruta
--     real (receita - CMV) / receita, a mesma do DRE.
-- ============================================================

-- ------------------------------------------------------------
-- Serie de caixa com saldo de abertura
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_series(_from DATE, _to DATE)
RETURNS TABLE (month DATE, cash_in NUMERIC, cash_out NUMERIC, balance NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH signed AS (
    SELECT reference_date,
           CASE WHEN type IN ('revenue','capital_in','investment') THEN amount ELSE 0 END AS c_in,
           CASE WHEN type IN ('expense','withdrawal')              THEN amount ELSE 0 END AS c_out
      FROM public.financial_entries
     WHERE deleted_at IS NULL
  ),
  opening AS (
    SELECT COALESCE(SUM(c_in - c_out), 0) AS bal
      FROM signed WHERE reference_date < _from
  ),
  months AS (
    SELECT generate_series(date_trunc('month', _from), date_trunc('month', _to), interval '1 month')::date AS m
  ),
  agg AS (
    SELECT mo.m,
           COALESCE(SUM(s.c_in), 0)  AS c_in,
           COALESCE(SUM(s.c_out), 0) AS c_out
      FROM months mo
      LEFT JOIN signed s
             ON s.reference_date >= mo.m
            AND s.reference_date < (mo.m + interval '1 month')::date
            AND s.reference_date BETWEEN _from AND _to
     GROUP BY mo.m
  )
  SELECT a.m, a.c_in, a.c_out,
         (SELECT bal FROM opening) + SUM(a.c_in - a.c_out) OVER (ORDER BY a.m)
    FROM agg a
   ORDER BY a.m;
$$;

-- ------------------------------------------------------------
-- Resumo consolidado do topo do dashboard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_days     INT  := GREATEST((_to - _from) + 1, 1);
  p_from     DATE := _from - v_days;
  p_to       DATE := _from - 1;
  v_as_of    DATE := LEAST(_to, CURRENT_DATE);
  cur        RECORD;
  prv        RECORD;
  v_cash     NUMERIC;
  v_sales_n  INT;
  v_sales_rv NUMERIC;
  v_cogs     NUMERIC;
  v_recv_t   NUMERIC; v_recv_o NUMERIC;
  v_pay_t    NUMERIC; v_pay_o  NUMERIC;
  v_burn     NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS revenue,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
    INTO cur
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS revenue,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
    INTO prv
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date BETWEEN p_from AND p_to;

  -- caixa acumulado desde sempre, nunca projetado para o futuro
  SELECT COALESCE(SUM(CASE WHEN type IN ('revenue','capital_in','investment') THEN amount
                           WHEN type IN ('expense','withdrawal')              THEN -amount
                           ELSE 0 END), 0)
    INTO v_cash
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND reference_date <= v_as_of;

  -- ticket: so a receita que veio de venda, sobre o numero de vendas
  SELECT COUNT(*), COALESCE(SUM(total_amount - discount), 0)
    INTO v_sales_n, v_sales_rv
    FROM public.sales
   WHERE deleted_at IS NULL AND sale_date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0) INTO v_cogs
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
   WHERE s.deleted_at IS NULL AND s.sale_date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(amount), 0),
         COALESCE(SUM(amount) FILTER (WHERE due_date < CURRENT_DATE), 0)
    INTO v_recv_t, v_recv_o
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND is_settled = false AND type IN ('revenue','capital_in');

  SELECT COALESCE(SUM(amount), 0),
         COALESCE(SUM(amount) FILTER (WHERE due_date < CURRENT_DATE), 0)
    INTO v_pay_t, v_pay_o
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND is_settled = false AND type IN ('expense','withdrawal');

  -- queima media dos ultimos 3 meses fechados, base do runway
  SELECT COALESCE(SUM(amount) / 3.0, 0) INTO v_burn
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND type = 'expense'
     AND reference_date >= (date_trunc('month', CURRENT_DATE) - interval '3 months')::date
     AND reference_date <  date_trunc('month', CURRENT_DATE)::date;

  RETURN jsonb_build_object(
    'from', _from, 'to', _to,
    'prev_from', p_from, 'prev_to', p_to,
    'revenue', cur.revenue, 'prev_revenue', prv.revenue,
    'expense', cur.expense, 'prev_expense', prv.expense,
    'net_result', cur.revenue - cur.expense,
    'prev_net_result', prv.revenue - prv.expense,
    'cogs', v_cogs,
    'gross_profit', cur.revenue - v_cogs,
    'gross_margin', CASE WHEN cur.revenue > 0
                         THEN ROUND((cur.revenue - v_cogs) * 100 / cur.revenue, 2) ELSE 0 END,
    'cash', v_cash, 'cash_as_of', v_as_of,
    'sales_count', v_sales_n,
    'sales_revenue', v_sales_rv,
    'ticket', CASE WHEN v_sales_n > 0 THEN ROUND(v_sales_rv / v_sales_n, 2) ELSE 0 END,
    'receivable_total', v_recv_t, 'receivable_overdue', v_recv_o,
    'payable_total', v_pay_t,     'payable_overdue', v_pay_o,
    'avg_monthly_expense', ROUND(v_burn, 2),
    'runway_months', CASE WHEN v_burn > 0 AND v_cash > 0
                          THEN ROUND(v_cash / v_burn, 1) ELSE NULL END
  );
END $$;

-- ------------------------------------------------------------
-- Ações do dia: o que exige decisão agora
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_action_items(_stale_days INT DEFAULT 5)
RETURNS TABLE (
  kind TEXT, severity TEXT, title TEXT, detail TEXT, amount NUMERIC, count BIGINT, link TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  -- contas a pagar vencidas
  SELECT 'payable_overdue', 'critical',
         COUNT(*) || ' conta(s) a pagar vencida(s)',
         'Vencimento mais antigo em ' || to_char(MIN(due_date), 'DD/MM/YYYY'),
         SUM(amount), COUNT(*), '/contas'
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND is_settled = false
     AND type IN ('expense','withdrawal') AND due_date < CURRENT_DATE
  HAVING COUNT(*) > 0

  UNION ALL
  -- recebimentos atrasados
  SELECT 'receivable_overdue', 'warning',
         COUNT(*) || ' recebimento(s) em atraso',
         'Mais antigo em ' || to_char(MIN(due_date), 'DD/MM/YYYY'),
         SUM(amount), COUNT(*), '/contas'
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND is_settled = false
     AND type IN ('revenue','capital_in') AND due_date < CURRENT_DATE
  HAVING COUNT(*) > 0

  UNION ALL
  -- vence nos proximos 7 dias
  SELECT 'payable_due_soon', 'info',
         COUNT(*) || ' conta(s) vencendo em 7 dias',
         'Total previsto no periodo', SUM(amount), COUNT(*), '/contas'
    FROM public.financial_entries
   WHERE deleted_at IS NULL AND is_settled = false
     AND type IN ('expense','withdrawal')
     AND due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
  HAVING COUNT(*) > 0

  UNION ALL
  -- pedidos parados no funil
  SELECT 'order_stale', 'warning',
         COUNT(*) || ' pedido(s) parado(s) ha mais de ' || _stale_days || ' dias',
         'Sem mudanca de status', SUM(total), COUNT(*), '/pedidos'
    FROM public.orders
   WHERE deleted_at IS NULL
     AND status NOT IN ('concluido','cancelado')
     AND COALESCE(status_changed_at, created_at) < (now() - (_stale_days || ' days')::interval)
  HAVING COUNT(*) > 0

  UNION ALL
  -- entregue e nao pago
  SELECT 'delivered_unpaid', 'critical',
         COUNT(*) || ' pedido(s) concluido(s) sem pagamento',
         'Entregue mas nao recebido', SUM(total), COUNT(*), '/pedidos'
    FROM public.orders
   WHERE deleted_at IS NULL AND status = 'concluido' AND payment_status <> 'pago'
  HAVING COUNT(*) > 0

  UNION ALL
  -- plano vendido sem custo cadastrado: quebra a margem
  SELECT 'plan_missing_cost', 'warning',
         COUNT(*) || ' plano(s) sem custo cadastrado',
         'A margem desses planos sai como 100%', NULL, COUNT(*), '/planos'
    FROM public.plans
   WHERE deleted_at IS NULL AND is_active AND unit_cost = 0
  HAVING COUNT(*) > 0
;
$$;

-- ------------------------------------------------------------
-- Funil de pedidos, com conversao e lead time — respeita o periodo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_orders_funnel(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_stages   JSONB;
  v_total    INT; v_done INT; v_cancel INT;
  v_value    NUMERIC; v_done_value NUMERIC;
  v_lead     NUMERIC;
  v_unpaid   NUMERIC;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'status', status, 'count', c, 'value', v) ORDER BY ord), '[]'::jsonb)
    INTO v_stages
    FROM (
      SELECT s.status, s.ord,
             COUNT(o.id) AS c,
             COALESCE(SUM(o.total), 0) AS v
        FROM (VALUES ('pendente',1),('em_negociacao',2),('em_execucao',3),
                     ('pronto_entrega',4),('concluido',5),('cancelado',6)) AS s(status, ord)
        LEFT JOIN public.orders o
               ON o.status::text = s.status
              AND o.deleted_at IS NULL
              AND o.order_created_at::date BETWEEN _from AND _to
       GROUP BY s.status, s.ord
    ) q;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'concluido'),
         COUNT(*) FILTER (WHERE status = 'cancelado'),
         COALESCE(SUM(total), 0),
         COALESCE(SUM(total) FILTER (WHERE status = 'concluido'), 0),
         COALESCE(SUM(total) FILTER (WHERE status = 'concluido' AND payment_status <> 'pago'), 0)
    INTO v_total, v_done, v_cancel, v_value, v_done_value, v_unpaid
    FROM public.orders
   WHERE deleted_at IS NULL AND order_created_at::date BETWEEN _from AND _to;

  -- dias entre o pedido chegar e ser concluido
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (status_changed_at - order_created_at)) / 86400.0)::numeric, 1)
    INTO v_lead
    FROM public.orders
   WHERE deleted_at IS NULL AND status = 'concluido'
     AND status_changed_at IS NOT NULL
     AND order_created_at::date BETWEEN _from AND _to;

  RETURN jsonb_build_object(
    'stages', v_stages,
    'total', v_total,
    'done', v_done,
    'cancelled', v_cancel,
    'total_value', v_value,
    'done_value', v_done_value,
    'delivered_unpaid_value', v_unpaid,
    -- conversao exclui cancelados do denominador: sao perda, nao pipeline
    'conversion', CASE WHEN (v_total - v_cancel) > 0
                       THEN ROUND(v_done::numeric * 100 / (v_total - v_cancel), 1) ELSE 0 END,
    'cancel_rate', CASE WHEN v_total > 0
                        THEN ROUND(v_cancel::numeric * 100 / v_total, 1) ELSE 0 END,
    'ticket', CASE WHEN v_total > 0 THEN ROUND(v_value / v_total, 2) ELSE 0 END,
    'lead_time_days', v_lead
  );
END $$;

-- ------------------------------------------------------------
-- Concentração de receita por cliente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_revenue_concentration(_from DATE, _to DATE, _limit INT DEFAULT 5)
RETURNS TABLE (customer_name TEXT, revenue NUMERIC, share NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH rev AS (
    SELECT COALESCE(c.name, 'Sem cliente vinculado') AS nome, SUM(fe.amount) AS total
      FROM public.financial_entries fe
      LEFT JOIN public.customers c ON c.id = fe.customer_id
     WHERE fe.deleted_at IS NULL AND fe.type = 'revenue'
       AND fe.reference_date BETWEEN _from AND _to
     GROUP BY 1
  )
  SELECT nome, total,
         CASE WHEN SUM(total) OVER () > 0
              THEN ROUND(total * 100 / SUM(total) OVER (), 1) ELSE 0 END
    FROM rev
   ORDER BY total DESC
   LIMIT _limit;
$$;

-- ------------------------------------------------------------
-- Desempenho por plano
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_plan_performance(_from DATE, _to DATE)
RETURNS TABLE (
  plan_name TEXT, orders_count BIGINT, revenue NUMERIC,
  cost NUMERIC, profit NUMERIC, margin NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(p.name, o.plan_name) AS plan_name,
         COUNT(*) AS orders_count,
         SUM(o.total) AS revenue,
         SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity) AS cost,
         SUM(o.total) - SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity) AS profit,
         CASE WHEN SUM(o.total) > 0
              THEN ROUND((SUM(o.total) - SUM(COALESCE(p.unit_cost, 0) + COALESCE(p.add_unit_cost, 0) * o.add_quantity))
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

-- ------------------------------------------------------------
-- Metas: alinhadas ao período selecionado, não a abas próprias
-- ------------------------------------------------------------
-- getPeriodMetrics filtrava metas que cruzam o período corrente enquanto
-- getProgressByCategory pegava TODAS as metas do tipo — o KPI e o gráfico ao
-- lado discordavam por construção. Agora ambos saem daqui.
CREATE OR REPLACE FUNCTION public.get_goals_overview(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_target NUMERIC; v_real NUMERIC; v_count INT;
  v_cats   JSONB;
  v_pace   NUMERIC;
  v_elapsed NUMERIC;
BEGIN
  SELECT COALESCE(SUM(target_value), 0), COALESCE(SUM(realized_value), 0), COUNT(*)
    INTO v_target, v_real, v_count
    FROM public.sales_goals
   WHERE start_date <= _to AND end_date >= _from;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'category', category, 'target', t, 'real', r,
           'pct', CASE WHEN t > 0 THEN ROUND(r * 100 / t, 1) ELSE 0 END) ORDER BY r DESC), '[]'::jsonb)
    INTO v_cats
    FROM (
      SELECT category, SUM(target_value) AS t, SUM(realized_value) AS r
        FROM public.sales_goals
       WHERE start_date <= _to AND end_date >= _from
       GROUP BY category
    ) q;

  -- ritmo esperado: quanto do período já passou
  SELECT LEAST(GREATEST((LEAST(CURRENT_DATE, _to) - _from + 1)::numeric
                        / GREATEST((_to - _from + 1)::numeric, 1), 0), 1)
    INTO v_elapsed;

  v_pace := v_target * v_elapsed;

  RETURN jsonb_build_object(
    'goal_count', v_count,
    'target', v_target,
    'real', v_real,
    'pct', CASE WHEN v_target > 0 THEN ROUND(v_real * 100 / v_target, 1) ELSE 0 END,
    'elapsed_pct', ROUND(v_elapsed * 100, 1),
    'expected_by_now', ROUND(v_pace, 2),
    -- acima de 0 = adiantado em relação ao ritmo necessário
    'pace_diff', ROUND(v_real - v_pace, 2),
    'categories', v_cats
  );
END $$;

-- ------------------------------------------------------------
-- grants
-- ------------------------------------------------------------
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'get_cash_series(date, date)',
    'get_dashboard_summary(date, date)',
    'get_action_items(int)',
    'get_orders_funnel(date, date)',
    'get_revenue_concentration(date, date, int)',
    'get_plan_performance(date, date)',
    'get_goals_overview(date, date)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
