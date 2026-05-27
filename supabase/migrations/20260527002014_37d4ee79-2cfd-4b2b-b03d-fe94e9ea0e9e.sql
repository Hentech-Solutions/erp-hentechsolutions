
ALTER TABLE public.sales_goals
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal_start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS realized_value numeric NOT NULL DEFAULT 0;

ALTER TABLE public.sales_entries
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- One goal per product (NULL product_id allowed multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS sales_goals_product_unique
  ON public.sales_goals(product_id)
  WHERE product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recalc_goal_realized(_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  total numeric;
BEGIN
  SELECT id, product_id, goal_start_date INTO g FROM public.sales_goals WHERE id = _goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF g.product_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM public.sales_entries
    WHERE product_id = g.product_id
      AND sale_date >= g.goal_start_date;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM public.sales_entries
    WHERE goal_id = g.id;
  END IF;

  UPDATE public.sales_goals SET realized_value = total WHERE id = g.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_entries_recalc_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected uuid;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.goal_id IS NOT NULL THEN
    PERFORM public.recalc_goal_realized(NEW.goal_id);
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.goal_id IS NOT NULL THEN
    PERFORM public.recalc_goal_realized(OLD.goal_id);
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.product_id IS NOT NULL THEN
    FOR affected IN
      SELECT id FROM public.sales_goals
      WHERE product_id = NEW.product_id
        AND goal_start_date <= NEW.sale_date
    LOOP
      PERFORM public.recalc_goal_realized(affected);
    END LOOP;
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.product_id IS NOT NULL THEN
    FOR affected IN
      SELECT id FROM public.sales_goals
      WHERE product_id = OLD.product_id
        AND goal_start_date <= OLD.sale_date
    LOOP
      PERFORM public.recalc_goal_realized(affected);
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sales_entries_recalc ON public.sales_entries;
CREATE TRIGGER sales_entries_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.sales_entries
FOR EACH ROW EXECUTE FUNCTION public.sales_entries_recalc_trigger();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.sales_goals LOOP
    PERFORM public.recalc_goal_realized(r.id);
  END LOOP;
END$$;
