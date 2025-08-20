-- RLS Policy Verification Queries
-- Run these in your Supabase SQL Editor to check optimization status

-- 1. Check current policy count per table
SELECT 
  schemaname, 
  tablename, 
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC;

-- 2. Check for auth.uid() vs (SELECT auth.uid()) usage
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
    THEN 'NEEDS_OPTIMIZATION'
    WHEN qual LIKE '%(SELECT auth.uid())%' 
    THEN 'OPTIMIZED'
    ELSE 'NO_AUTH_CHECK'
  END as auth_optimization_status,
  qual as policy_definition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY auth_optimization_status, tablename;

-- 3. Check for multiple permissive policies (problem indicators)
WITH policy_stats AS (
  SELECT 
    schemaname,
    tablename,
    cmd,
    COUNT(*) as policy_count
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename, cmd
)
SELECT 
  tablename,
  cmd as command_type,
  policy_count,
  CASE 
    WHEN policy_count > 1 THEN 'MULTIPLE_POLICIES_ISSUE'
    ELSE 'OPTIMIZED'
  END as status
FROM policy_stats
WHERE policy_count > 1
ORDER BY policy_count DESC;

-- 4. Performance-related indexes check
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (
    indexname LIKE '%_user_id%' OR 
    indexname LIKE '%_agent_id%' OR 
    indexname LIKE '%_role%'
  )
ORDER BY tablename;

-- 5. Migration log check (if applied)
SELECT * FROM public.migration_log 
WHERE migration_name LIKE '%optimize%' 
ORDER BY applied_at DESC;
