-- Add status fields for orders and invoices to support cancel/delete operations

-- Add status column to orders table if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'active';

-- Add status and source columns to invoices table if not exists  
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- Add deleted invoices table for logging
CREATE TABLE IF NOT EXISTS public.deleted_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_invoice_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0.00,
  invoice_date DATE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID,
  reason TEXT,
  original_data JSONB NOT NULL
);

-- Enable RLS on deleted_invoices
ALTER TABLE public.deleted_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for deleted_invoices
CREATE POLICY "Admins can manage deleted invoices" 
ON public.deleted_invoices 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_invoice_status ON public.orders(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_deleted_invoices_original_id ON public.deleted_invoices(original_invoice_id);