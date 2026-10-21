-- financial_entries.customer_id was added without a foreign key, so PostgREST
-- cannot resolve the customers(name) relationship used by Contas a Pagar.
UPDATE public.financial_entries fe
   SET customer_id = NULL
 WHERE fe.customer_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.customers c WHERE c.id = fe.customer_id
   );

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  ON DELETE SET NULL;
