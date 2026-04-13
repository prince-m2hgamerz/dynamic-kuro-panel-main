
-- Phase 4: Add display_name to telegram_bots
ALTER TABLE public.telegram_bots ADD COLUMN IF NOT EXISTS display_name text;

-- Phase 5: Add package_restricted to license_keys
ALTER TABLE public.license_keys ADD COLUMN IF NOT EXISTS package_restricted boolean NOT NULL DEFAULT false;

-- Phase 5: Create approved_packages table
CREATE TABLE IF NOT EXISTS public.approved_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(package_name)
);

ALTER TABLE public.approved_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to approved_packages"
  ON public.approved_packages FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Owners can manage approved packages"
  ON public.approved_packages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

CREATE POLICY "Authenticated users can view active packages"
  ON public.approved_packages FOR SELECT TO authenticated
  USING (is_active = true);
