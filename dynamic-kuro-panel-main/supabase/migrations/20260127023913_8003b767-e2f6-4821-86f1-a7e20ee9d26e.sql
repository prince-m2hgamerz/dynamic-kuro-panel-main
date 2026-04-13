-- Create RPC function for cascading user delete
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from profiles (cascades to related data)
  DELETE FROM public.profiles WHERE id = target_user_id;
  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  -- Delete license keys created by this user
  DELETE FROM public.license_keys WHERE created_by = target_user_id;
  -- Delete referral codes created by this user
  DELETE FROM public.referral_codes WHERE created_by = target_user_id;
  -- Note: auth.users deletion requires edge function with service role
END;
$$;

-- Grant execute to authenticated users (will be validated in edge function)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;