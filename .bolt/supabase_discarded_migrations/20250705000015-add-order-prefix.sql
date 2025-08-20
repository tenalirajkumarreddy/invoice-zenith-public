-- Add order prefix columns to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS order_prefix TEXT NOT NULL DEFAULT 'ORD-2025-',
ADD COLUMN IF NOT EXISTS next_order_number INTEGER NOT NULL DEFAULT 1;

-- Update existing records to have default order prefix
UPDATE public.company_settings 
SET 
  order_prefix = 'ORD-2025-',
  next_order_number = 1
WHERE order_prefix IS NULL;

-- Create function to get next order number
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
  result TEXT;
BEGIN
  -- Get current settings
  SELECT next_order_number, order_prefix 
  INTO next_num, prefix
  FROM public.company_settings 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Generate order number
  result := prefix || LPAD(next_num::TEXT, 3, '0');
  
  -- Update next order number
  UPDATE public.company_settings 
  SET next_order_number = next_order_number + 1 
  WHERE is_active = true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 