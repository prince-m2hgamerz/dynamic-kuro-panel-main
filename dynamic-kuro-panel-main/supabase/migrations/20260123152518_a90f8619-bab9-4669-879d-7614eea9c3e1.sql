-- Fix security warnings

-- 1. Fix update_updated_at function to have explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Replace overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert their own audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);