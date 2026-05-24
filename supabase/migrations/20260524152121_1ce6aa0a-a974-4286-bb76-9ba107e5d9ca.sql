
-- Replace permissive "true" RLS policies with authenticated-only policies

-- audit_log
DROP POLICY IF EXISTS v1_all_select_audit_log ON public.audit_log;
DROP POLICY IF EXISTS v1_all_insert_audit_log ON public.audit_log;
DROP POLICY IF EXISTS v1_all_update_audit_log ON public.audit_log;
DROP POLICY IF EXISTS v1_all_delete_audit_log ON public.audit_log;
CREATE POLICY auth_select_audit_log ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_audit_log ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_audit_log ON public.audit_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_audit_log ON public.audit_log FOR DELETE TO authenticated USING (true);

-- dashboard_alerts
DROP POLICY IF EXISTS v1_all_select_dashboard_alerts ON public.dashboard_alerts;
DROP POLICY IF EXISTS v1_all_insert_dashboard_alerts ON public.dashboard_alerts;
DROP POLICY IF EXISTS v1_all_update_dashboard_alerts ON public.dashboard_alerts;
DROP POLICY IF EXISTS v1_all_delete_dashboard_alerts ON public.dashboard_alerts;
CREATE POLICY auth_select_dashboard_alerts ON public.dashboard_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_dashboard_alerts ON public.dashboard_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_dashboard_alerts ON public.dashboard_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_dashboard_alerts ON public.dashboard_alerts FOR DELETE TO authenticated USING (true);

-- financial_categories
DROP POLICY IF EXISTS v1_all_select_financial_categories ON public.financial_categories;
DROP POLICY IF EXISTS v1_all_insert_financial_categories ON public.financial_categories;
DROP POLICY IF EXISTS v1_all_update_financial_categories ON public.financial_categories;
DROP POLICY IF EXISTS v1_all_delete_financial_categories ON public.financial_categories;
CREATE POLICY auth_select_financial_categories ON public.financial_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_financial_categories ON public.financial_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_financial_categories ON public.financial_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_financial_categories ON public.financial_categories FOR DELETE TO authenticated USING (true);

-- financial_entries
DROP POLICY IF EXISTS v1_all_select_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS v1_all_insert_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS v1_all_update_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS v1_all_delete_financial_entries ON public.financial_entries;
CREATE POLICY auth_select_financial_entries ON public.financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_financial_entries ON public.financial_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_financial_entries ON public.financial_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_financial_entries ON public.financial_entries FOR DELETE TO authenticated USING (true);

-- integration_configs
DROP POLICY IF EXISTS v1_all_select_integration_configs ON public.integration_configs;
DROP POLICY IF EXISTS v1_all_insert_integration_configs ON public.integration_configs;
DROP POLICY IF EXISTS v1_all_update_integration_configs ON public.integration_configs;
DROP POLICY IF EXISTS v1_all_delete_integration_configs ON public.integration_configs;
CREATE POLICY auth_select_integration_configs ON public.integration_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_integration_configs ON public.integration_configs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_integration_configs ON public.integration_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_integration_configs ON public.integration_configs FOR DELETE TO authenticated USING (true);

-- product_categories
DROP POLICY IF EXISTS v1_all_select_product_categories ON public.product_categories;
DROP POLICY IF EXISTS v1_all_insert_product_categories ON public.product_categories;
DROP POLICY IF EXISTS v1_all_update_product_categories ON public.product_categories;
DROP POLICY IF EXISTS v1_all_delete_product_categories ON public.product_categories;
CREATE POLICY auth_select_product_categories ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_product_categories ON public.product_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_product_categories ON public.product_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_product_categories ON public.product_categories FOR DELETE TO authenticated USING (true);

-- products
DROP POLICY IF EXISTS v1_all_select_products ON public.products;
DROP POLICY IF EXISTS v1_all_insert_products ON public.products;
DROP POLICY IF EXISTS v1_all_update_products ON public.products;
DROP POLICY IF EXISTS v1_all_delete_products ON public.products;
CREATE POLICY auth_select_products ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_products ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_products ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_products ON public.products FOR DELETE TO authenticated USING (true);

-- sale_items
DROP POLICY IF EXISTS v1_all_select_sale_items ON public.sale_items;
DROP POLICY IF EXISTS v1_all_insert_sale_items ON public.sale_items;
DROP POLICY IF EXISTS v1_all_update_sale_items ON public.sale_items;
DROP POLICY IF EXISTS v1_all_delete_sale_items ON public.sale_items;
CREATE POLICY auth_select_sale_items ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_sale_items ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_sale_items ON public.sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_sale_items ON public.sale_items FOR DELETE TO authenticated USING (true);

-- sales
DROP POLICY IF EXISTS v1_all_select_sales ON public.sales;
DROP POLICY IF EXISTS v1_all_insert_sales ON public.sales;
DROP POLICY IF EXISTS v1_all_update_sales ON public.sales;
DROP POLICY IF EXISTS v1_all_delete_sales ON public.sales;
CREATE POLICY auth_select_sales ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_sales ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_sales ON public.sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_sales ON public.sales FOR DELETE TO authenticated USING (true);
