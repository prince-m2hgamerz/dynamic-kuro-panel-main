-- Enable realtime for license_keys table
ALTER PUBLICATION supabase_realtime ADD TABLE public.license_keys;

-- Enable realtime for profiles table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;