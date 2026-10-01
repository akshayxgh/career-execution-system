-- Migration: Add COMPANY_WEBSITE to my_jobs constraint and update vw_decision_intelligence
-- Date: 2026-10-01

-- 1. Update the check constraint on my_jobs
ALTER TABLE public.my_jobs DROP CONSTRAINT IF EXISTS my_jobs_status_check;

ALTER TABLE public.my_jobs ADD CONSTRAINT my_jobs_status_check 
  CHECK (status IN (
    'NEW', 
    'SAVED', 
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

-- 2. Update vw_decision_intelligence so COMPANY_WEBSITE jobs appear in Decision Intelligence
CREATE OR REPLACE VIEW public.vw_decision_intelligence
WITH (security_invoker = true) AS
SELECT
  j.id,
  j.company_id,
  j.title,
  j.company_name,
  j.location,
  j.description,
  j.experience,
  j.salary,
  j.posted_date,
  j.url,
  j.source,
  j.scraper,
  j.search_keyword,
  j.search_location,
  ja.score,
  ja.recommendation,
  ja.reason,
  ja.email_to_hr,
  ja.hr_email,
  ja.confidence,
  ja.analyzed_at,
  COALESCE(mj.status, 'NEW') AS my_status,
  mj.updated_at AS status_updated_at
FROM public.jobs j
JOIN public.job_analysis ja ON j.id = ja.job_id
LEFT JOIN public.my_jobs mj ON j.id = mj.job_id
WHERE COALESCE(mj.status, 'NEW') IN ('NEW', 'SAVED', 'COMPANY_WEBSITE');
