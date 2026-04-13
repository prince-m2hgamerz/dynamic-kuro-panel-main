-- Add columns to license_keys to track telegram user for notifications
ALTER TABLE public.license_keys
ADD COLUMN telegram_id bigint DEFAULT NULL,
ADD COLUMN bot_id uuid DEFAULT NULL REFERENCES telegram_bots(id) ON DELETE SET NULL,
ADD COLUMN expiry_notified boolean DEFAULT false;

-- Create index for efficient expiry queries
CREATE INDEX idx_license_keys_expiry_notification 
ON public.license_keys (expires_at, expiry_notified, status) 
WHERE telegram_id IS NOT NULL AND expiry_notified = false AND status = 'active';