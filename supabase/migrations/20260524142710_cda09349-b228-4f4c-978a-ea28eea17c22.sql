
ALTER VIEW public.v_monthly_summary SET (security_invoker = true);
ALTER VIEW public.v_product_metrics SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
