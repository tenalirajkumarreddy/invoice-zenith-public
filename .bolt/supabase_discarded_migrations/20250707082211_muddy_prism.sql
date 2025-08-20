/*
  # Create Customer Transactions Table

  1. New Tables
    - `customer_transactions`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers.id)
      - `invoice_id` (uuid, references invoices.id, nullable)
      - `order_id` (uuid, references orders.id, nullable)
      - `transaction_type` (text, constrained values)
      - `amount` (decimal)
      - `balance_before` (decimal)
      - `balance_after` (decimal)
      - `outstanding_before` (decimal)
      - `outstanding_after` (decimal)
      - `payment_method` (text, nullable)
      - `description` (text)
      - `reference_number` (text, nullable)
      - `agent_id` (uuid, references profiles.user_id, nullable)
      - `created_at` (timestamp)
      - `metadata` (jsonb, nullable)

  2. Security
    - Enable RLS on `customer_transactions` table
    - Add policies for admins and agents to view/insert transactions

  3. Indexes
    - Performance indexes on customer_id, invoice_id, created_at, transaction_type

  4. Functions
    - Helper functions for inserting and retrieving transactions
*/

-- Create customer_transactions table
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
  reference_number TEXT,
  agent_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on customer_transactions
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_transactions
CREATE POLICY "Admins can manage all transactions" 
ON public.customer_transactions 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Agents can view and insert transactions" 
ON public.customer_transactions 
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'agent')
));

CREATE POLICY "Agents can insert transactions" 
ON public.customer_transactions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'agent')
));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_invoice_id ON public.customer_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_order_id ON public.customer_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created_at ON public.customer_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON public.customer_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_agent_id ON public.customer_transactions(agent_id);

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

-- Create a function to insert customer transaction
CREATE OR REPLACE FUNCTION public.insert_customer_transaction(
  p_customer_id UUID,
  p_invoice_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_transaction_type TEXT,
  p_amount DECIMAL(10,2),
  p_balance_before DECIMAL(10,2),
  p_balance_after DECIMAL(10,2),
  p_outstanding_before DECIMAL(10,2),
  p_outstanding_after DECIMAL(10,2),
  p_payment_method TEXT DEFAULT NULL,
  p_description TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
BEGIN
  INSERT INTO public.customer_transactions (
    customer_id,
    invoice_id,
    order_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    outstanding_before,
    outstanding_after,
    payment_method,
    description,
    reference_number,
    agent_id,
    metadata
  ) VALUES (
    p_customer_id,
    p_invoice_id,
    p_order_id,
    p_transaction_type,
    p_amount,
    p_balance_before,
    p_balance_after,
    p_outstanding_before,
    p_outstanding_after,
    p_payment_method,
    p_description,
    p_reference_number,
    p_agent_id,
    p_metadata
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get customer transactions with related data
CREATE OR REPLACE FUNCTION public.get_customer_transactions(
  p_customer_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount DECIMAL(10,2),
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  outstanding_before DECIMAL(10,2),
  outstanding_after DECIMAL(10,2),
  payment_method TEXT,
  description TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  invoice_number TEXT,
  order_number TEXT,
  agent_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.transaction_type,
    ct.amount,
    ct.balance_before,
    ct.balance_after,
    ct.outstanding_before,
    ct.outstanding_after,
    ct.payment_method,
    ct.description,
    ct.reference_number,
    ct.created_at,
    ct.metadata,
    i.invoice_number,
    o.order_number,
    p.full_name as agent_name
  FROM public.customer_transactions ct
  LEFT JOIN public.invoices i ON ct.invoice_id = i.id
  LEFT JOIN public.orders o ON ct.order_id = o.id
  LEFT JOIN public.profiles p ON ct.agent_id = p.user_id
  WHERE ct.customer_id = p_customer_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;