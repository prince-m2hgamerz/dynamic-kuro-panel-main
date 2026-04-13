-- Fix foreign key constraints to allow bot deletion
-- Drop existing foreign keys
ALTER TABLE pending_payments 
DROP CONSTRAINT IF EXISTS pending_payments_bot_id_fkey;

ALTER TABLE price_settings 
DROP CONSTRAINT IF EXISTS price_settings_bot_id_fkey;

ALTER TABLE license_keys 
DROP CONSTRAINT IF EXISTS license_keys_bot_id_fkey;

-- Re-add with ON DELETE SET NULL (preserves historical data)
ALTER TABLE pending_payments
ADD CONSTRAINT pending_payments_bot_id_fkey 
FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE SET NULL;

ALTER TABLE price_settings
ADD CONSTRAINT price_settings_bot_id_fkey 
FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE SET NULL;

ALTER TABLE license_keys
ADD CONSTRAINT license_keys_bot_id_fkey 
FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE SET NULL;