-- Add contact_url column to telegram_bots table for Contact Us button
ALTER TABLE public.telegram_bots 
ADD COLUMN contact_url text DEFAULT NULL;