-- Create route_assignments table for tracking route assignments (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.route_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id TEXT NOT NULL UNIQUE, -- Format: RA-YYYYMMDD-XXX
  route_code TEXT NOT NULL REFERENCES public.routes(route_code) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES public.profiles(agent_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(user_id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_time TIMESTAMP WITH TIME ZONE,
  started_time TIMESTAMP WITH TIME ZONE,
  finished_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'started', 'finished', 'cancelled')),
  
  -- Stock management
  opening_stock JSONB, -- {product_id: quantity, ...}
  closing_stock JSONB, -- {product_id: quantity, ...}
  
  -- Financial tracking
  cash_collected DECIMAL(10,2) DEFAULT 0,
  upi_collected DECIMAL(10,2) DEFAULT 0,
  pending_amount DECIMAL(10,2) DEFAULT 0,
  balance_used DECIMAL(10,2) DEFAULT 0, -- Credit/balance amount used
  total_collected DECIMAL(10,2) DEFAULT 0,
  
  -- Route performance
  customers_visited INTEGER DEFAULT 0,
  customers_with_orders INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  -- Notes and comments
  admin_notes TEXT,
  agent_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for stock management (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_orders table for tracking orders during route (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.route_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_assignment_id UUID NOT NULL REFERENCES public.route_assignments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Order details
  items JSONB NOT NULL, -- [{product_id, quantity, unit_price, total_price}, ...]
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment details
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'balance', 'mixed')),
  cash_amount DECIMAL(10,2) DEFAULT 0,
  upi_amount DECIMAL(10,2) DEFAULT 0,
  balance_used DECIMAL(10,2) DEFAULT 0,
  outstanding_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  delivered_time TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to generate route assignment ID (replace if exists)
CREATE OR REPLACE FUNCTION public.generate_route_id()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  route_id TEXT;
BEGIN
  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(route_id FROM 12) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.route_assignments
  WHERE route_id LIKE 'RA-' || today_date || '-%';
  
  route_id := 'RA-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN route_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps (replace if exists)
CREATE OR REPLACE FUNCTION public.update_route_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update route order timestamps (replace if exists)
CREATE OR REPLACE FUNCTION public.update_route_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update product timestamps (replace if exists)
CREATE OR REPLACE FUNCTION public.update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_route_assignment_updated_at ON public.route_assignments;
DROP TRIGGER IF EXISTS update_route_order_updated_at ON public.route_orders;
DROP TRIGGER IF EXISTS update_product_updated_at ON public.products;

-- Create triggers
CREATE TRIGGER update_route_assignment_updated_at 
  BEFORE UPDATE ON public.route_assignments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_route_assignment_updated_at();

CREATE TRIGGER update_route_order_updated_at 
  BEFORE UPDATE ON public.route_orders 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_route_order_updated_at();

CREATE TRIGGER update_product_updated_at 
  BEFORE UPDATE ON public.products 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_product_updated_at();

-- Enable RLS
ALTER TABLE public.route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all route assignments" ON public.route_assignments;
DROP POLICY IF EXISTS "Agents can view their own route assignments" ON public.route_assignments;
DROP POLICY IF EXISTS "Agents can update their own route assignments" ON public.route_assignments;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Agents can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage all route orders" ON public.route_orders;
DROP POLICY IF EXISTS "Agents can manage their route orders" ON public.route_orders;

-- RLS Policies for route_assignments
CREATE POLICY "Admins can manage all route assignments" ON public.route_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can view their own route assignments" ON public.route_assignments
FOR SELECT USING (
  agent_id = (
    SELECT agent_id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Agents can update their own route assignments" ON public.route_assignments
FOR UPDATE USING (
  agent_id = (
    SELECT agent_id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for products
CREATE POLICY "Admins can manage products" ON public.products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can view products" ON public.products
FOR SELECT USING (true);

-- RLS Policies for route_orders
CREATE POLICY "Admins can manage all route orders" ON public.route_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can manage their route orders" ON public.route_orders
FOR ALL USING (
  route_assignment_id IN (
    SELECT id FROM public.route_assignments 
    WHERE agent_id = (
      SELECT agent_id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Insert sample products only if they don't exist
INSERT INTO public.products (product_code, product_name, description, category, unit_price, cost_price, tax_rate) 
SELECT 'PROD-001', 'LED Bulb 9W', 'Energy efficient LED bulb', 'Lighting', 120.00, 80.00, 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'PROD-001');

INSERT INTO public.products (product_code, product_name, description, category, unit_price, cost_price, tax_rate) 
SELECT 'PROD-002', 'Switch Board', 'Electrical switch board', 'Electrical', 45.00, 30.00, 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'PROD-002');

INSERT INTO public.products (product_code, product_name, description, category, unit_price, cost_price, tax_rate) 
SELECT 'PROD-003', 'Wire 1.5mm', 'Copper wire 1.5mm', 'Electrical', 180.00, 120.00, 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'PROD-003');

INSERT INTO public.products (product_code, product_name, description, category, unit_price, cost_price, tax_rate) 
SELECT 'PROD-004', 'MCB 16A', 'Miniature Circuit Breaker', 'Electrical', 85.00, 55.00, 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'PROD-004');

INSERT INTO public.products (product_code, product_name, description, category, unit_price, cost_price, tax_rate) 
SELECT 'PROD-005', 'Socket 5A', 'Electrical socket 5A', 'Electrical', 35.00, 25.00, 18.00
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'PROD-005');

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_route_assignments_agent_id ON public.route_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_status ON public.route_assignments(status);
CREATE INDEX IF NOT EXISTS idx_route_assignments_date ON public.route_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_route_orders_route_assignment_id ON public.route_orders(route_assignment_id);
CREATE INDEX IF NOT EXISTS idx_route_orders_customer_id ON public.route_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active); 