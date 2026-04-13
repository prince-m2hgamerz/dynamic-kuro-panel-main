-- Create panel_licenses table for managing panel activation licenses
CREATE TABLE public.panel_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.panel_licenses ENABLE ROW LEVEL SECURITY;

-- Only owner can manage panel licenses
CREATE POLICY "Owner can manage panel licenses"
ON public.panel_licenses FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Insert default license
INSERT INTO public.panel_licenses (license_key, description, is_active)
VALUES ('Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E', 'Default Panel License', true);