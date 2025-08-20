-- Add outstanding column to customers table
ALTER TABLE public.customers 
ADD COLUMN outstanding DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add comment to explain the column
COMMENT ON COLUMN public.customers.outstanding IS 'Outstanding amount owed by the customer'; 