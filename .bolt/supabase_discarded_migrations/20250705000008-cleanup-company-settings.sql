-- Clean up duplicate company settings records
-- Keep only the most recent active record

-- First, deactivate all records except the most recent one
UPDATE public.company_settings 
SET is_active = false 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.company_settings
    WHERE is_active = true
  ) ranked
  WHERE rn = 1
);

-- If no active records exist, activate the most recent one
UPDATE public.company_settings 
SET is_active = true 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.company_settings
  ) ranked
  WHERE rn = 1
) AND is_active = false;

-- Ensure we have at least one record with default values
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
  account_holder_name,
  is_active
) 
SELECT 
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
  'InvoiceZenith Billing Hub',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings WHERE is_active = true
); 