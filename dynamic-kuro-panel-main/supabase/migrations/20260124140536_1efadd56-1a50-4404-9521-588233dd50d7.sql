-- Telegram bot users (for broadcast)
CREATE TABLE public.telegram_bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  first_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bot_users ENABLE ROW LEVEL SECURITY;

-- Service role can manage (bot uses service role)
CREATE POLICY "Service role can manage telegram users" ON public.telegram_bot_users
FOR ALL USING (true) WITH CHECK (true);

-- Pending payments (replaces Python dict)
CREATE TABLE public.pending_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  telegram_username text,
  amount int NOT NULL,
  duration text NOT NULL,
  user_type text NOT NULL DEFAULT 'user',
  transaction_id text,
  status text DEFAULT 'pending',
  admin_message_id bigint,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Service role can manage
CREATE POLICY "Service role can manage pending payments" ON public.pending_payments
FOR ALL USING (true) WITH CHECK (true);

-- Admins can view
CREATE POLICY "Admins can view pending payments" ON public.pending_payments
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));