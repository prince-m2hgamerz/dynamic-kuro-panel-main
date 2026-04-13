-- Add telegram_username and transaction_id columns to license_keys table
-- These will store the buyer's Telegram username and their payment transaction ID
ALTER TABLE public.license_keys 
ADD COLUMN telegram_username TEXT,
ADD COLUMN transaction_id TEXT;