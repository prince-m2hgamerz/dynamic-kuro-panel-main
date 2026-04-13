DROP POLICY IF EXISTS "Owners can manage approved packages" ON public.approved_packages;
CREATE POLICY "Authenticated users can manage approved packages"
  ON public.approved_packages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
