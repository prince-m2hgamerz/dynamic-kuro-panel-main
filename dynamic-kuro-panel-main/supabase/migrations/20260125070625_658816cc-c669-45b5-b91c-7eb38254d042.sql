-- Add 'co_owner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'co_owner';

-- Create the user account for latesorryfor94@gmail.com
-- Note: User will be created via edge function with service role