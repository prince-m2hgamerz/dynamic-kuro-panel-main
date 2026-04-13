-- Allow bot-generated keys (created_by can be null for Telegram bot keys)
ALTER TABLE public.license_keys ALTER COLUMN created_by DROP NOT NULL;