-- ══════════════════════════════════════════════════════════════════════
-- DROPWING OS — HR & PERFORMANCE PATCH
-- Run this in Supabase SQL Editor to resolve 404 table errors
-- ══════════════════════════════════════════════════════════════════════

-- 1. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    status text NOT NULL DEFAULT 'present',
    checked_in_at timestamp with time zone DEFAULT now(),
    checked_out_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_auth_access" ON public.attendance;
CREATE POLICY "attendance_auth_access" ON public.attendance FOR ALL USING (auth.role() = 'authenticated');

-- 2. Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by uuid REFERENCES public.profiles(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_auth_access" ON public.leave_requests;
CREATE POLICY "leave_auth_access" ON public.leave_requests FOR ALL USING (auth.role() = 'authenticated');

-- 3. Performance Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id uuid REFERENCES public.profiles(id),
    reviewee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    period text NOT NULL, -- e.g. '2025-Q1'
    rating integer CHECK (rating >= 1 AND rating <= 5),
    feedback text,
    status text DEFAULT 'submitted',
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_auth_access" ON public.reviews;
CREATE POLICY "reviews_auth_access" ON public.reviews FOR ALL USING (auth.role() = 'authenticated');
