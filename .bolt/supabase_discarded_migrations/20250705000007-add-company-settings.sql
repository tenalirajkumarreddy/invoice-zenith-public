-- Create company_settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'InvoiceZenith Billing Hub',
  gst_number TEXT,
  business_address TEXT,
  phone TEXT,
  email TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-2025-',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  currency TEXT NOT NULL DEFAULT 'INR',
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_holder_name TEXT,
  logo_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default company settings
INSERT INTO public.company_settings (
  company_name,
  gst_number,
  business_address,
  phone,
  email,
  invoice_prefix,
  next_invoice_number,
  default_tax_rate,
  payment_terms_days,
  currency,
  bank_name,
  account_number,
  ifsc_code,
  account_holder_name
) VALUES (
  'InvoiceZenith Billing Hub',
  '27AAAPL1234C1Z5',
  '123, Business Complex, Mumbai - 400001',
  '+91 98765 43210',
  'billing@invoicezenith.com',
  'INV-2025-',
  1,
  18.00,
  30,
  'INR',
  'State Bank of India',
  '1234567890123456',
  'SBIN0001234',
  'InvoiceZenith Billing Hub'
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company settings
CREATE POLICY "Admins can manage company settings" ON public.company_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Agents can view company settings" ON public.company_settings
FOR SELECT USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
CREATE TRIGGER update_company_settings_updated_at 
  BEFORE UPDATE ON public.company_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_company_settings_updated_at();

-- Create function to get next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
  result TEXT;
BEGIN
  -- Get current settings
  SELECT next_invoice_number, invoice_prefix 
  INTO next_num, prefix
  FROM public.company_settings 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Generate invoice number
  result := prefix || LPAD(next_num::TEXT, 3, '0');
  
  -- Update next invoice number
  UPDATE public.company_settings 
  SET next_invoice_number = next_invoice_number + 1 
  WHERE is_active = true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 