
-- Create a SECURITY DEFINER function to check if the current user is the ghost owner
-- This moves the ghost owner email check from client-side to server-side
CREATE OR REPLACE FUNCTION public.is_ghost_owner(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
BEGIN
  -- Get the user's email from auth.users (only accessible via service role/security definer)
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  
  -- Check against the ghost owner email
  RETURN COALESCE(lower(_email) = 'mukarramkhanking332@gmail.com', false);
END;
$$;

-- Create a function to check if a user should be hidden (ghost user)
CREATE OR REPLACE FUNCTION public.is_ghost_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
  _is_hidden boolean;
BEGIN
  -- Check email
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF lower(_email) = 'mukarramkhanking332@gmail.com' THEN
    RETURN true;
  END IF;
  
  -- Check is_hidden flag
  SELECT is_hidden INTO _is_hidden FROM profiles WHERE id = _user_id;
  RETURN COALESCE(_is_hidden, false);
END;
$$;
