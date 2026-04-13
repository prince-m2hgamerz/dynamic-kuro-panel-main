-- Add admin_action_token column for short callback data (Telegram max 64 bytes)
ALTER TABLE public.pending_payments 
ADD COLUMN IF NOT EXISTS admin_action_token text UNIQUE;

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_pending_payments_admin_action_token 
ON public.pending_payments(admin_action_token);

-- Add bot_id column if not exists for multi-bot safety
ALTER TABLE public.pending_payments 
ADD COLUMN IF NOT EXISTS bot_id uuid REFERENCES public.telegram_bots(id);