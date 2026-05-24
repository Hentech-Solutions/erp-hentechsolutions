
-- ============== ENUMS ==============
CREATE TYPE financial_entry_type AS ENUM ('revenue','expense','investment','withdrawal','capital_in');
CREATE TYPE cash_flow_category AS ENUM ('operational','investment','financing');
CREATE TYPE product_status AS ENUM ('active','inactive');
CREATE TYPE expense_recurrence AS ENUM ('one_time','monthly','quarterly','annual');
CREATE TYPE alert_severity AS ENUM ('info','warning','critical');
CREATE TYPE integration_type AS ENUM ('payment_gateway','erp','bank_api','sales_platform','accounting');

-- ============== updated_at trigger ==============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============== product_categories ==============
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== products ==============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  margin NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN price = 0 THEN 0
    ELSE ROUND(((price - cost) / price) * 100, 4)
    END
  ) STORED,
  status product_status NOT NULL DEFAULT 'active',
  sku TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_products_status ON public.products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON public.products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name ON public.products USING gin(to_tsvector('portuguese', name));
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== financial_categories ==============
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type financial_entry_type NOT NULL,
  color TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== financial_entries ==============
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type financial_entry_type NOT NULL,
  cash_flow_cat cash_flow_category NOT NULL DEFAULT 'operational',
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference_date DATE NOT NULL,
  payment_date DATE,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  recurrence expense_recurrence NOT NULL DEFAULT 'one_time',
  recurrence_group_id UUID,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sale_id UUID,
  external_ref TEXT,
  notes TEXT,
  attachment_path TEXT,
  exported_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fe_type ON public.financial_entries(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_fe_ref_date ON public.financial_entries(reference_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_fe_category ON public.financial_entries(category_id);
CREATE INDEX idx_fe_product ON public.financial_entries(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_fe_settled ON public.financial_entries(is_settled, payment_date);
CREATE INDEX idx_fe_recurrence_group ON public.financial_entries(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;
CREATE TRIGGER trg_fe_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== sales ==============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== sale_items ==============
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS ((unit_price * quantity) - discount) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);

-- ============== dashboard_alerts ==============
CREATE TABLE public.dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_unread ON public.dashboard_alerts(is_read, created_at) WHERE NOT is_read;

-- ============== integration_configs ==============
CREATE TABLE public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type integration_type NOT NULL,
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, name)
);
CREATE TRIGGER trg_integration_configs_updated_at BEFORE UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== audit_log ==============
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_changed_at ON public.audit_log(changed_at);

-- ============== VIEWS ==============
CREATE VIEW public.v_monthly_summary AS
SELECT
  DATE_TRUNC('month', reference_date) AS month,
  SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type IN ('investment','capital_in') THEN amount ELSE 0 END) AS capital_in,
  SUM(CASE WHEN type='withdrawal' THEN amount ELSE 0 END) AS withdrawals,
  SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS gross_profit,
  COUNT(*) FILTER (WHERE type='revenue') AS revenue_count
FROM public.financial_entries
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY 1;

CREATE VIEW public.v_product_metrics AS
SELECT
  p.id, p.name, p.status, p.price, p.cost, p.margin,
  COALESCE(SUM(si.quantity),0) AS units_sold,
  COALESCE(SUM(si.subtotal),0) AS total_revenue,
  COALESCE(SUM(si.unit_cost * si.quantity),0) AS total_cost,
  COALESCE(SUM(si.subtotal) - SUM(si.unit_cost * si.quantity),0) AS total_profit,
  MAX(s.sale_date) AS last_sale_date
FROM public.products p
LEFT JOIN public.sale_items si ON si.product_id = p.id
LEFT JOIN public.sales s ON s.id = si.sale_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.status, p.price, p.cost, p.margin;

-- ============== RLS (permissivo v1) ==============
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['product_categories','products','financial_categories','financial_entries','sales','sale_items','dashboard_alerts','integration_configs','audit_log']) LOOP
    EXECUTE format('CREATE POLICY "v1_all_select_%I" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "v1_all_insert_%I" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "v1_all_update_%I" ON public.%I FOR UPDATE USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "v1_all_delete_%I" ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;

-- ============== SEED categorias do sistema ==============
INSERT INTO public.financial_categories (name, type, color, is_system) VALUES
  ('Venda de Produto','revenue','#22c55e',true),
  ('Serviço Prestado','revenue','#16a34a',true),
  ('Outras Receitas','revenue','#86efac',true),
  ('Custo Operacional','expense','#ef4444',true),
  ('Folha de Pagamento','expense','#dc2626',true),
  ('Marketing','expense','#f97316',true),
  ('Infraestrutura','expense','#fb923c',true),
  ('Outras Despesas','expense','#fca5a5',true),
  ('Aporte Sócio','capital_in','#3b82f6',true),
  ('Financiamento','capital_in','#60a5fa',true),
  ('Investimento Ativo','investment','#8b5cf6',true),
  ('Retirada Sócio','withdrawal','#6b7280',true);
