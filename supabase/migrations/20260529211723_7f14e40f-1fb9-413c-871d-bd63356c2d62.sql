-- 1) Update recalc to include product sales from sale_items (joined to sales for date)
CREATE OR REPLACE FUNCTION public.recalc_goal_realized(_goal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g RECORD;
  total numeric;
BEGIN
  SELECT id, product_id, goal_start_date INTO g FROM public.sales_goals WHERE id = _goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF g.product_id IS NOT NULL THEN
    SELECT
      COALESCE((
        SELECT SUM(amount) FROM public.sales_entries
        WHERE product_id = g.product_id AND sale_date >= g.goal_start_date
      ), 0)
      +
      COALESCE((
        SELECT SUM(si.quantity * si.unit_price - COALESCE(si.discount, 0))
        FROM public.sale_items si
        JOIN public.sales s ON s.id = si.sale_id
        WHERE si.product_id = g.product_id AND s.sale_date >= g.goal_start_date
      ), 0)
    INTO total;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM public.sales_entries
    WHERE goal_id = g.id;
  END IF;

  UPDATE public.sales_goals SET realized_value = total WHERE id = g.id;
END;
$function$;

-- 2) Trigger on sale_items to recalc product-linked goals
CREATE OR REPLACE FUNCTION public.sale_items_recalc_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected uuid;
  pid uuid;
  sdate date;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.product_id IS NOT NULL THEN
    SELECT sale_date INTO sdate FROM public.sales WHERE id = NEW.sale_id;
    FOR affected IN
      SELECT id FROM public.sales_goals
      WHERE product_id = NEW.product_id AND goal_start_date <= COALESCE(sdate, CURRENT_DATE)
    LOOP
      PERFORM public.recalc_goal_realized(affected);
    END LOOP;
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.product_id IS NOT NULL THEN
    SELECT sale_date INTO sdate FROM public.sales WHERE id = OLD.sale_id;
    FOR affected IN
      SELECT id FROM public.sales_goals
      WHERE product_id = OLD.product_id AND goal_start_date <= COALESCE(sdate, CURRENT_DATE)
    LOOP
      PERFORM public.recalc_goal_realized(affected);
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS sale_items_recalc ON public.sale_items;
CREATE TRIGGER sale_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.sale_items_recalc_trigger();

-- 3) Backfill: recalc all goals linked to products to include historical sales
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.sales_goals WHERE product_id IS NOT NULL LOOP
    PERFORM public.recalc_goal_realized(r.id);
  END LOOP;
END$$;