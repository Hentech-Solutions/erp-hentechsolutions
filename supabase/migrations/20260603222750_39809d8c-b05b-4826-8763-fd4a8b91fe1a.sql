
CREATE POLICY "statements admin/manager read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'statements' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE POLICY "statements admin/manager insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'statements' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE POLICY "statements admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'statements' AND public.has_role(auth.uid(), 'admin'));
