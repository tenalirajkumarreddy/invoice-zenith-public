-- Add transaction history table for tracking customer financial transactions
CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice_payment', 'balance_payment', 'refund', 'opening_balance', 'manual_adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  outstanding_before DECIMAL(10,2) NOT NULL,
  outstanding_after DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'balance', 'mixed')),
  description TEXT NOT NULL,
  reference_number TEXT, -- invoice number, order number, etc.
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB -- Additional data like refund reason, etc.
);

-- Enable RLS on customer_transactions
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_transactions
CREATE POLICY "Users can view transactions for their customers" 
ON public.customer_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'agent')
));

CREATE POLICY "Users can insert transactions" 
ON public.customer_transactions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'agent')
));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_invoice_id ON public.customer_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created_at ON public.customer_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON public.customer_transactions(transaction_type);

-- Add comments to explain the table and columns
COMMENT ON TABLE public.customer_transactions IS 'Tracks all financial transactions for customers including payments, refunds, and adjustments';
COMMENT ON COLUMN public.customer_transactions.transaction_type IS 'Type of transaction: invoice_payment, balance_payment, refund, opening_balance, manual_adjustment';
COMMENT ON COLUMN public.customer_transactions.amount IS 'Transaction amount (positive for credits, negative for debits)';
COMMENT ON COLUMN public.customer_transactions.balance_before IS 'Customer balance before transaction';
COMMENT ON COLUMN public.customer_transactions.balance_after IS 'Customer balance after transaction';
COMMENT ON COLUMN public.customer_transactions.outstanding_before IS 'Customer outstanding before transaction';
COMMENT ON COLUMN public.customer_transactions.outstanding_after IS 'Customer outstanding after transaction';
COMMENT ON COLUMN public.customer_transactions.reference_number IS 'Reference number like invoice number or order number';
COMMENT ON COLUMN public.customer_transactions.metadata IS 'Additional transaction data like refund reason, etc.'; 