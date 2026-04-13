-- Change amount column from INTEGER to DECIMAL to support prices like ₹0.99
ALTER TABLE public.pending_payments 
ALTER COLUMN amount TYPE DECIMAL(10,2) USING amount::DECIMAL(10,2);