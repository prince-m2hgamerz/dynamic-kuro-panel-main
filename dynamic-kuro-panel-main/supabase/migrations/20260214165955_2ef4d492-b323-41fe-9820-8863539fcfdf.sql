
-- Update profiles RLS: allow co_owner to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update profiles RLS: allow co_owner to update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update user_roles RLS: allow co_owner to manage all roles
DROP POLICY IF EXISTS "Owners can manage all roles" ON public.user_roles;
CREATE POLICY "Owners can manage all roles" ON public.user_roles
FOR ALL USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update audit_logs RLS: allow co_owner to view
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update license_keys RLS: allow co_owner to manage/view all keys
DROP POLICY IF EXISTS "Admins can manage all keys" ON public.license_keys;
CREATE POLICY "Admins can manage all keys" ON public.license_keys
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

DROP POLICY IF EXISTS "Admins can view all keys" ON public.license_keys;
CREATE POLICY "Admins can view all keys" ON public.license_keys
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update games RLS: allow co_owner
DROP POLICY IF EXISTS "Admins can manage games" ON public.games;
CREATE POLICY "Admins can manage games" ON public.games
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

-- Update songs RLS: co_owner already has access via existing policies

-- Update key_activations: allow co_owner to view
DROP POLICY IF EXISTS "Admins can view all activations" ON public.key_activations;
CREATE POLICY "Admins can view all activations" ON public.key_activations
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);
