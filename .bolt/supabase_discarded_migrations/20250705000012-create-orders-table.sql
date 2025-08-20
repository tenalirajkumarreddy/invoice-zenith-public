-- Create orders table for storing customer orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Order details
  items JSONB NOT NULL, -- [{product_id, product_code, product_name, quantity, unit_price, total_price}, ...]
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
  
  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Notes
  admin_notes TEXT,
  customer_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to update order timestamps
CREATE OR REPLACE FUNCTION public.update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_order_updated_at ON public.orders;

-- Create trigger
CREATE TRIGGER update_order_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_order_updated_at();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can view route orders" ON public.orders;

-- RLS Policies for orders
CREATE POLICY "Admins can manage all orders" ON public.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can view route orders" ON public.orders
FOR SELECT USING (
  customer_id IN (
    SELECT c.id FROM public.customers c
    JOIN public.routes r ON c.route_id = r.id
    JOIN public.profiles p ON p.agent_id = (
      SELECT ra.agent_id FROM public.route_assignments ra
      WHERE ra.route_code = r.route_code
      AND ra.status IN ('accepted', 'started')
      AND ra.agent_id = (
        SELECT agent_id FROM public.profiles 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number); 