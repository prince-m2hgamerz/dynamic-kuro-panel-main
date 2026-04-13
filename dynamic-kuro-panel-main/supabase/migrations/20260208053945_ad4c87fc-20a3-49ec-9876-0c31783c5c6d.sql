-- Drop the existing policy that's not working for anon users
DROP POLICY IF EXISTS "Anyone can validate active referral codes" ON public.referral_codes;

-- Create a proper policy for anonymous users to validate referral codes during registration
CREATE POLICY "Anon can validate active referral codes" 
ON public.referral_codes 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);