-- Add route_symbol field to routes table
ALTER TABLE public.routes ADD COLUMN route_symbol TEXT;

-- Add comment to explain the route_symbol field
COMMENT ON COLUMN public.routes.route_symbol IS 'Route symbol (A, B, C, etc.) for easy identification';

-- Create function to auto-assign customers to routes based on pincode
CREATE OR REPLACE FUNCTION public.auto_assign_customer_to_route()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If customer already has a route_id, don't change it
  IF NEW.route_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find route based on pincode
  SELECT id INTO NEW.route_id
  FROM public.routes
  WHERE NEW.pincode = ANY(pincodes)
    AND is_active = true
  LIMIT 1;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign customers to routes
CREATE TRIGGER auto_assign_customer_route_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_customer_to_route(); 