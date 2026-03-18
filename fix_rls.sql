-- ========================================================
-- FIX: Infinite Recursion Error in RLS Policies 
-- Run this in the Supabase SQL Editor to resolve the 500/406 errors
-- ========================================================

-- 1. Wipe all existing policies on user_roles and ventures that cause the loop
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', pol.policyname);
    END LOOP;
    
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'ventures' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON ventures', pol.policyname);
    END LOOP;
END
$$;

-- 2. Create safe, non-recursive policies for the internal portal
-- Everyone in the internal portal needs to see other users (for assigning tasks, messages, etc)
CREATE POLICY "Allow all authenticated users to read profiles"
  ON user_roles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only update their own profile data (avatars, name)
CREATE POLICY "Allow users to update own profile"
  ON user_roles FOR UPDATE
  USING (auth.uid() = id);

-- Everyone needs to be able to read ventures (companies)
CREATE POLICY "Allow all authenticated users to read ventures"
  ON ventures FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;
