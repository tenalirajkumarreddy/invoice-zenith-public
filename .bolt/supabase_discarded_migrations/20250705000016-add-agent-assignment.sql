-- Add agent assignment to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS agent_id TEXT REFERENCES public.profiles(agent_id),
ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT false;

-- Create table for order assignments to route assignments
CREATE TABLE IF NOT EXISTS public.order_route_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  route_assignment_id UUID NOT NULL REFERENCES public.route_assignments(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, route_assignment_id)
);

-- Enable RLS
ALTER TABLE public.order_route_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_route_assignments
CREATE POLICY "Admins can manage order route assignments" ON public.order_route_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can view their order route assignments" ON public.order_route_assignments
FOR SELECT USING (
  route_assignment_id IN (
    SELECT id FROM public.route_assignments 
    WHERE agent_id = (
      SELECT agent_id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_route_assignments_order_id ON public.order_route_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_route_assignments_route_assignment_id ON public.order_route_assignments(route_assignment_id); 