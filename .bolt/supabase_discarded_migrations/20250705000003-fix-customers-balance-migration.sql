-- Fix customers balance migration - handle existing balance column
-- Check if balance column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'balance'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    END IF;
END $$;

-- Migrate existing data: balance = outstanding - credit
-- Only update if credit and outstanding columns still exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'credit'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'outstanding'
    ) THEN
        UPDATE public.customers 
        SET balance = outstanding - credit
        WHERE balance = 0; -- Only update if balance is still default
    END IF;
END $$;

-- Drop old columns if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'credit'
    ) THEN
        ALTER TABLE public.customers DROP COLUMN credit;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'outstanding'
    ) THEN
        ALTER TABLE public.customers DROP COLUMN outstanding;
    END IF;
END $$;

-- Add comment to explain the balance field
COMMENT ON COLUMN public.customers.balance IS 'Positive = owner owes customer, Negative = customer owes owner, Zero = no balance'; 