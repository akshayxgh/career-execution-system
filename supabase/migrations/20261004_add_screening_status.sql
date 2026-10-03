-- Migration: Add SCREENING to my_jobs constraint and update view
-- Date: 2026-10-04

-- 1. Drop the existing check constraint on my_jobs.status
ALTER TABLE public.my_jobs DROP CONSTRAINT IF EXISTS my_jobs_status_check;

-- 2. Re-create the constraint including SCREENING
ALTER TABLE public.my_jobs ADD CONSTRAINT my_jobs_status_check 
  CHECK (status IN (
    'NEW', 
    'SAVED', 
    'COMPANY_WEBSITE', 
    'APPLIED', 
    'SCREENING',
    'INTERVIEW', 
    'OFFER', 
    'REJECTED', 
    'JOINED', 
    'WITHDRAWN', 
    'DECLINED', 
    'HIDDEN'
  ));

-- 3. Add screening_logs JSONB column to my_jobs
ALTER TABLE public.my_jobs ADD COLUMN IF NOT EXISTS screening_logs JSONB DEFAULT '[]'::jsonb;

