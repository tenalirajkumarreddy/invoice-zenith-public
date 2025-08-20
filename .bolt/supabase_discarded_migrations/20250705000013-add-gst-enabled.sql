-- Add gst_enabled column to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update existing records to have gst_enabled = true
UPDATE public.company_settings 
SET gst_enabled = true 
WHERE gst_enabled IS NULL; 