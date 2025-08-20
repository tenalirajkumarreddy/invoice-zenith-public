/*
  # Create Migration Log Table
  
  This table tracks performance optimizations and migration history
*/

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migration_log (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  performance_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view migration logs
CREATE POLICY "migration_log_admin_policy" ON public.migration_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_migration_log_name ON public.migration_log(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_log_applied_at ON public.migration_log(applied_at);

-- Insert initial log entry
INSERT INTO public.migration_log (migration_name, applied_at, description, performance_impact) 
VALUES (
  '20250723000000_create_migration_log', 
  now(), 
  'Created migration log table for tracking database optimizations',
  'Minimal impact - new table for logging only'
) ON CONFLICT (migration_name) DO NOTHING;
