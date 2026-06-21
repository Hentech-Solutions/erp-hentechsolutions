CREATE TYPE public.order_status AS ENUM ('pendente', 'em_execucao', 'concluido', 'cancelado');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  order_created_at timestamptz NOT NULL,
  customer_name text NOT NULL,
  customer_whatsapp text NOT NULL,
  customer_email text NOT NULL,
  customer_company text,
  customer_role text,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  plan_price numeric(12,2) NOT NULL,
  add_quantity integer NOT NULL DEFAULT 0,
  add_unit_price numeric(12,2) NOT NULL DEFAULT 0,
  add_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  add_discount_applied boolean NOT NULL DEFAULT false,
  add_saving numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  notes text,
  status public.order_status NOT NULL DEFAULT 'pendente',
  status_changed_at timestamptz,
  notified_at timestamptz,
  raw_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update orders" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();