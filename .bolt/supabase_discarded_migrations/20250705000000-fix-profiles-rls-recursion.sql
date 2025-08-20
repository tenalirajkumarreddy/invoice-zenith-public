-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that allows users to view their own profile
-- This replaces the previous policies and avoids the recursion issue
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Add a policy for inserting new profiles (needed for user registration)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add a policy for updating own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- For admin functionality, we'll handle it at the application level
-- or create a separate admin-only table/function if needed 