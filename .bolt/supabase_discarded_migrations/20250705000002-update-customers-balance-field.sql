-- Update customers table to use single balance field
-- Add new balance column
ALTER TABLE public.customers ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Migrate existing data: balance = outstanding - credit
UPDATE public.customers 
SET balance = outstanding - credit;

-- Drop old columns
ALTER TABLE public.customers DROP COLUMN credit;
ALTER TABLE public.customers DROP COLUMN outstanding;

-- Add comment to explain the balance field
COMMENT ON COLUMN public.customers.balance IS 'Positive = owner owes customer, Negative = customer owes owner, Zero = no balance'; 