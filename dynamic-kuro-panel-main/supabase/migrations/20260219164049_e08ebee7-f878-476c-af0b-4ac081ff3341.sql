
-- Fix: Make profiles_safe view use SECURITY INVOKER (default, safe)
ALTER VIEW public.profiles_safe SET (security_invoker = on);
