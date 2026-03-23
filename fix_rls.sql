-- ========================================================
-- FIX: Infinite Recursion Error in RLS Policies 
-- Run this in the Supabase SQL Editor to resolve the 500/406 errors
-- ========================================================

-- 1. Wipe all existing policies on profiles and companies that cause the loop
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
    
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
    END LOOP;
END
$$;

-- 2. Create safe, non-recursive policies for the internal portal
-- Everyone in the internal portal needs to see other users (for assigning tasks, messages, etc)
CREATE POLICY "Allow all authenticated users to read profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only update their own profile data (avatars, name)
CREATE POLICY "Allow users to update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Everyone needs to be able to read companies
CREATE POLICY "Allow all authenticated users to read companies"
  ON companies FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
