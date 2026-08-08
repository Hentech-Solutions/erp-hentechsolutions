-- ============================================================
-- Liga a audit_log: a tabela e os indices existem desde a primeira migration,
-- mas nenhum trigger escrevia nela e nenhuma tela lia. Num sistema financeiro
-- com mais de um operador, saber quem alterou o que nao e opcional.
-- ============================================================

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_id    UUID;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old  JSONB;
  v_new  JSONB;
  v_id   UUID;
  v_uid  UUID := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW); v_id := NEW.id;
  ELSE
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_id := NEW.id;
    -- ignora update que nao mudou nada de fato (ex.: so o updated_at)
    IF v_old - 'updated_at' = v_new - 'updated_at' THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, operation, old_data, new_data, user_id, user_email)
  VALUES (
    TG_TABLE_NAME, v_id, TG_OP, v_old, v_new, v_uid,
    (SELECT email FROM auth.users WHERE id = v_uid)
  );

  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t      TEXT;
  tables TEXT[] := ARRAY[
    'financial_entries','sales','sale_items','products','customers','orders',
    'sales_goals','financial_categories','user_roles','api_clients'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t, t);
  END LOOP;
END $$;

-- leitura paginada para a tela de auditoria (admin)
CREATE OR REPLACE FUNCTION public.get_audit_log(
  _table  TEXT DEFAULT NULL,
  _from   DATE DEFAULT NULL,
  _to     DATE DEFAULT NULL,
  _limit  INT  DEFAULT 100,
  _offset INT  DEFAULT 0
)
RETURNS TABLE (
  id BIGINT, table_name TEXT, record_id UUID, operation TEXT,
  old_data JSONB, new_data JSONB, user_email TEXT, changed_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.id, a.table_name, a.record_id, a.operation,
         a.old_data, a.new_data, a.user_email, a.changed_at,
         COUNT(*) OVER () AS total_count
    FROM public.audit_log a
   WHERE (_table IS NULL OR a.table_name = _table)
     AND (_from  IS NULL OR a.changed_at >= _from)
     AND (_to    IS NULL OR a.changed_at < (_to + 1))
   ORDER BY a.changed_at DESC
   LIMIT LEAST(COALESCE(_limit, 100), 500) OFFSET COALESCE(_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.get_audit_log(TEXT, DATE, DATE, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_log(TEXT, DATE, DATE, INT, INT) TO authenticated;
