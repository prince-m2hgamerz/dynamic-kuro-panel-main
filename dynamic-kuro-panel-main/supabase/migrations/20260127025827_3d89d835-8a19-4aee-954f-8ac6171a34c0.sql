-- Create maintenance_access table for granular user access during maintenance
CREATE TABLE public.maintenance_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.maintenance_access ENABLE ROW LEVEL SECURITY;

-- Only owners/co_owners can manage access
CREATE POLICY "Owners can manage maintenance access"
ON public.maintenance_access FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

-- Users can check their own access
CREATE POLICY "Users can check own maintenance access"
ON public.maintenance_access FOR SELECT
USING (user_id = auth.uid());

-- Create security definer function to check maintenance access
CREATE OR REPLACE FUNCTION public.check_maintenance_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM maintenance_access
    WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;