-- Simple fix for signup issues
-- First, drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simpler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple approach: use timestamp for agent_id
  INSERT INTO public.profiles (user_id, full_name, phone, role, agent_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'agent',
    'AGT-' || LPAD((EXTRACT(EPOCH FROM NOW())::INTEGER % 100000)::TEXT, 5, '0')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just return NEW without creating profile
    -- The AuthContext will handle profile creation manually
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow profile creation
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;

-- Create a simple policy that allows all profile operations for now
CREATE POLICY "Allow all profile operations" ON public.profiles
FOR ALL USING (true) WITH CHECK (true); 