-- Add tax_amount column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add comment to explain the column
COMMENT ON COLUMN public.invoices.tax_amount IS 'Tax amount (GST) for the invoice'; 