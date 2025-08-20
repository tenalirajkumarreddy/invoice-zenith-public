-- Add missing columns to existing orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS items JSONB,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Update existing orders to have default values
UPDATE public.orders 
SET 
  items = '[]'::jsonb,
  subtotal = total_amount,
  tax_amount = 0
WHERE items IS NULL;

-- Make required columns NOT NULL after setting defaults
ALTER TABLE public.orders 
ALTER COLUMN items SET NOT NULL,
ALTER COLUMN subtotal SET NOT NULL,
ALTER COLUMN tax_amount SET NOT NULL;

-- Update status constraint to include new statuses
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')); 