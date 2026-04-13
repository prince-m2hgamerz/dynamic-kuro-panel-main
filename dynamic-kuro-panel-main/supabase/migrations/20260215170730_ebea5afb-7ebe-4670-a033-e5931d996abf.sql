
-- 1. Fix referral_codes: remove duplicate policies, tighten access
DROP POLICY IF EXISTS "Admins can view all referral codes" ON public.referral_codes;

-- 2. Fix profiles: explicitly deny anon access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

-- 3. Fix extension in public schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pgcrypto to extensions schema if it exists in public
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pgcrypto: %', SQLERRM;
END $$;
