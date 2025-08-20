-- Create function to auto-generate customer ID
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  result TEXT;
BEGIN
  -- Get the next customer number by counting existing customers + 1
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.customers
  WHERE customer_id ~ '^CUS-[0-9]+$';
  
  -- Generate customer ID
  result := 'CUS-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to set customer_id before insert
CREATE OR REPLACE FUNCTION public.set_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NULL OR NEW.customer_id = '' THEN
    NEW.customer_id := public.generate_customer_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on customers table
CREATE TRIGGER set_customer_id_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_id();