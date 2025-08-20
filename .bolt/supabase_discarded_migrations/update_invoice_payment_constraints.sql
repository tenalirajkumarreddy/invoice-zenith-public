-- Update payment_mode constraint to allow 'balance' and 'mixed'
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_payment_mode_check;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_payment_mode_check 
CHECK (payment_mode IN ('cash', 'upi', 'credit', 'balance', 'mixed'));

-- Add separate payment columns for better tracking
ALTER TABLE public.invoices 
ADD COLUMN cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN upi_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add comments to explain the columns
COMMENT ON COLUMN public.invoices.cash_amount IS 'Amount paid in cash';
COMMENT ON COLUMN public.invoices.upi_amount IS 'Amount paid via UPI';
COMMENT ON COLUMN public.invoices.balance_amount IS 'Amount paid using customer balance'; 