
-- Update the trigger to allow service_role (migrations/admin) to bypass
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role app_role;
BEGIN
  -- Skip check if called from service_role context (no auth.uid)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the caller's role
  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Only owner/co_owner/admin can modify these sensitive fields
  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'co_owner', 'admin') THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN
      RAISE EXCEPTION 'Permission denied: cannot modify balance';
    END IF;
    IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden THEN
      RAISE EXCEPTION 'Permission denied: cannot modify visibility';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Permission denied: cannot modify status';
    END IF;
    IF NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
      RAISE EXCEPTION 'Permission denied: cannot modify invited_by';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Same for roles trigger
CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'co_owner') THEN
    RAISE EXCEPTION 'Permission denied: only owners can modify roles';
  END IF;
  
  RETURN NEW;
END;
$$;
