-- Function to generate unique customer ID
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_id INTEGER;
  customer_id TEXT;
BEGIN
  -- Get the next available ID number
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_id FROM 4) AS INTEGER)), 0) + 1
  INTO next_id
  FROM public.customers
  WHERE customer_id ~ '^CST\d+$';
  
  -- Format the customer ID (CST + 6-digit number)
  customer_id := 'CST' || LPAD(next_id::TEXT, 6, '0');
  
  RETURN customer_id;
END;
$$;

-- Create trigger function to automatically set customer_id
CREATE OR REPLACE FUNCTION public.set_customer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS NULL OR NEW.customer_id = '' THEN
    NEW.customer_id := public.generate_customer_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set customer_id before insert
CREATE TRIGGER set_customer_id_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_id(); 