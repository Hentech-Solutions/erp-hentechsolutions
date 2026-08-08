-- ============================================================
-- RBAC real: substitui as policies "USING (true)" por papel.
--   SELECT        -> qualquer usuario COM papel atribuido (is_member)
--   INSERT/UPDATE -> admin | manager (is_staff)
--   DELETE        -> admin (nucleo financeiro) / staff (metas e alertas)
-- ============================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- ---------- fecha as SECURITY DEFINER expostas como RPC ----------
-- Triggers rodam independente de GRANT; ninguem precisa chama-las via API.
-- Hoje `recalc_goal_realized` e chamavel por anon e reescreve sales_goals.realized_value.
REVOKE ALL ON FUNCTION public.handle_new_user_role()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sales_entries_recalc_trigger()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sale_items_recalc_trigger()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_goal_realized(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at()                FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

REVOKE ALL ON FUNCTION public.is_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin()  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()  TO authenticated;

-- ---------- aplica o padrao nas tabelas de negocio ----------
DO $$
DECLARE
  t         TEXT;
  pol       RECORD;
  del_staff TEXT[] := ARRAY['sales_goals','sales_entries','dashboard_alerts'];
  tables    TEXT[] := ARRAY[
    'products','product_categories','financial_categories','financial_entries',
    'sales','sale_items','customers','sales_goals','sales_entries',
    'orders','dashboard_alerts','integration_configs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_member())',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff())',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
      t || '_update', t);

    IF t = ANY(del_staff) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_staff())',
        t || '_delete', t);
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
        t || '_delete', t);
    END IF;
  END LOOP;
END $$;

-- ---------- audit_log: leitura admin; escrita apenas via trigger ----------
DROP POLICY IF EXISTS auth_select_audit_log ON public.audit_log;
DROP POLICY IF EXISTS auth_insert_audit_log ON public.audit_log;
DROP POLICY IF EXISTS auth_update_audit_log ON public.audit_log;
DROP POLICY IF EXISTS auth_delete_audit_log ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated;

-- ---------- user_roles: admin administra ----------
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin());
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- ---------- um cadastro novo nao ganha acesso sozinho ----------
-- Antes: todo signup recebia 'user' e passava a ler a base inteira.
-- Agora: so o primeiro usuario (bootstrap) vira admin. Os demais ficam sem papel
-- ate um admin conceder e, sem papel, is_member() ja barra o SELECT.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;

-- ---------- decisao de negocio: Rafael passa a manager ----------
UPDATE public.user_roles
   SET role = 'manager'
 WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rafaelcordeiro299@gmail.com')
   AND role = 'user';
