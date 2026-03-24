-- Phase 3 Migration: Approvals and File Storage

-- 1. Approvals Table
CREATE TABLE public.approvals (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    requester_id uuid REFERENCES public.profiles(id),
    reviewer_id uuid REFERENCES public.profiles(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);

-- RLS for Approvals
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approvals are viewable by everyone in the company" 
ON public.approvals FOR SELECT USING (true);
CREATE POLICY "Approvals can be created by anyone" 
ON public.approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "Approvals can be updated by anyone" 
ON public.approvals FOR UPDATE USING (true);
CREATE POLICY "Approvals can be deleted by anyone" 
ON public.approvals FOR DELETE USING (true);


-- 2. Task Files Table
CREATE TABLE public.task_files (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploader_id uuid REFERENCES public.profiles(id),
    file_name text NOT NULL,
    file_size integer,
    file_type text,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for Task Files
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task files are viewable by everyone" 
ON public.task_files FOR SELECT USING (true);
CREATE POLICY "Task files can be inserted by anyone" 
ON public.task_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Task files can be deleted by anyone" 
ON public.task_files FOR DELETE USING (true);

-- Warning: Don't forget to create the "task-attachments" storage bucket manually in Supabase!
