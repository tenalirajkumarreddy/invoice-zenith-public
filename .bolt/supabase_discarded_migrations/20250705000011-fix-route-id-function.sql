-- Fix the generate_route_id function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.generate_route_id()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  new_route_id TEXT;
BEGIN
  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(ra.route_id FROM 12) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.route_assignments ra
  WHERE ra.route_id LIKE 'RA-' || today_date || '-%';
  
  new_route_id := 'RA-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN new_route_id;
END;
$$ LANGUAGE plpgsql; 