
-- Drop the overly permissive self-update policy
DROP POLICY "Users can update own profile" ON public.profiles;

-- Create a restricted self-update policy that ONLY allows safe fields
-- Users can update their own profile but NOT balance, is_hidden, invited_by, status
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create a function to prevent users from modifying sensitive columns
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role app_role;
BEGIN
  -- Get the caller's role
  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Only owner/co_owner/admin can modify these sensitive fields
  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'co_owner', 'admin') THEN
    -- Prevent balance changes
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN
      RAISE EXCEPTION 'Permission denied: cannot modify balance';
    END IF;
    -- Prevent is_hidden changes
    IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden THEN
      RAISE EXCEPTION 'Permission denied: cannot modify visibility';
    END IF;
    -- Prevent status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Permission denied: cannot modify status';
    END IF;
    -- Prevent invited_by changes
    IF NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
      RAISE EXCEPTION 'Permission denied: cannot modify invited_by';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Also ensure regular users cannot INSERT/UPDATE/DELETE on user_roles
-- The existing policy only allows owners/co_owners for ALL and users for SELECT
-- Add explicit deny for INSERT by non-privileged users (already covered by lack of INSERT policy)
-- But let's add an extra trigger for safety

CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role app_role;
BEGIN
  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'co_owner') THEN
    RAISE EXCEPTION 'Permission denied: only owners can modify roles';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_role_modifications ON public.user_roles;
CREATE TRIGGER protect_role_modifications
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_role_changes();
