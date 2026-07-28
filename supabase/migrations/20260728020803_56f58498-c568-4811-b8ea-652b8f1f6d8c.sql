CREATE TABLE public.telegram_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  chat_id text NOT NULL UNIQUE,
  notify_new_order boolean NOT NULL DEFAULT true,
  notify_sale boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_recipients TO authenticated;
GRANT ALL ON public.telegram_recipients TO service_role;

ALTER TABLE public.telegram_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telegram_recipients" ON public.telegram_recipients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert telegram_recipients" ON public.telegram_recipients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update telegram_recipients" ON public.telegram_recipients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete telegram_recipients" ON public.telegram_recipients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER telegram_recipients_updated_at BEFORE UPDATE ON public.telegram_recipients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.telegram_recipients (label, chat_id) VALUES ('Sócio 1', '894471119'), ('Sócio 2', '8405930398');