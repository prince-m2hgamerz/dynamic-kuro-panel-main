-- Update handle_new_user() to assign 'admin' role instead of 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, invited_by)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'invited_by')::uuid
  );
  
  -- Assign 'admin' role (changed from 'user')
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Allow anonymous users to validate referral codes during registration
CREATE POLICY "Anyone can validate active referral codes"
ON public.referral_codes FOR SELECT
TO anon
USING (is_active = true);