-- Migration: Add COMPANY_PORTAL and COMPANY_WEBSITE to my_jobs status check constraint
-- Date: 2026-09-30

-- 1. Drop the existing check constraint on my_jobs.status
ALTER TABLE public.my_jobs DROP CONSTRAINT IF EXISTS my_jobs_status_check;

-- 2. Re-create the constraint including COMPANY_PORTAL and COMPANY_WEBSITE
ALTER TABLE public.my_jobs ADD CONSTRAINT my_jobs_status_check 
  CHECK (status IN (
    'NEW', 
    'SAVED', 
    'COMPANY_PORTAL', 
    'COMPANY_WEBSITE', 
    'APPLIED', 
    'INTERVIEW', 
    'OFFER', 
    'REJECTED', 
    'JOINED', 
    'WITHDRAWN', 
    'DECLINED', 
    'HIDDEN'
  ));

-- 3. (Optional) Update any existing saved jobs that have notes about company portal
UPDATE public.my_jobs
SET status = 'COMPANY_PORTAL'
WHERE status = 'SAVED'
  AND (
    LOWER(notes) LIKE '%portal%' 
    OR LOWER(notes) LIKE '%company%'
  );
