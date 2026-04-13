-- Update handle_new_user function to set initial balance from referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  referral_balance numeric := 0;
BEGIN
  -- Get initial balance from referral code if exists
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT COALESCE(initial_balance, 0) INTO referral_balance
    FROM public.referral_codes
    WHERE code = NEW.raw_user_meta_data->>'referral_code';
  END IF;

  INSERT INTO public.profiles (id, username, invited_by, balance)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'invited_by')::uuid,
    referral_balance
  );
  
  -- Assign 'admin' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$function$;