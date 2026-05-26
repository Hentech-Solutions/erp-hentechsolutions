
DO $$ BEGIN
  CREATE TYPE public.goal_period_type AS ENUM ('weekly','monthly','quarterly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  period_type public.goal_period_type NOT NULL,
  target_value numeric NOT NULL CHECK (target_value >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.sales_goals(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  sale_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_entries_goal_id ON public.sales_entries(goal_id);
CREATE INDEX idx_sales_entries_sale_date ON public.sales_entries(sale_date);
CREATE INDEX idx_sales_goals_dates ON public.sales_goals(start_date, end_date);

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_select_sales_goals ON public.sales_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_sales_goals ON public.sales_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_sales_goals ON public.sales_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_sales_goals ON public.sales_goals FOR DELETE TO authenticated USING (true);

CREATE POLICY auth_select_sales_entries ON public.sales_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_sales_entries ON public.sales_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_sales_entries ON public.sales_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_sales_entries ON public.sales_entries FOR DELETE TO authenticated USING (true);
