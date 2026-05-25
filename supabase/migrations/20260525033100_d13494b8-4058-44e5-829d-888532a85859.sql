
-- Enums
CREATE TYPE public.person_type AS ENUM ('individual', 'company');
CREATE TYPE public.document_type AS ENUM ('cpf', 'cnpj');

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type public.person_type NOT NULL DEFAULT 'individual',
  name TEXT NOT NULL,
  document_type public.document_type,
  document TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique document when present and not deleted
CREATE UNIQUE INDEX customers_document_unique_idx
  ON public.customers (document)
  WHERE document IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX customers_name_idx ON public.customers (name);
CREATE INDEX customers_deleted_at_idx ON public.customers (deleted_at);

-- Trigger updated_at
CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_select_customers ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_customers ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_customers ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_customers ON public.customers FOR DELETE TO authenticated USING (true);

-- Link sales to customer
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX sales_customer_id_idx ON public.sales (customer_id);
