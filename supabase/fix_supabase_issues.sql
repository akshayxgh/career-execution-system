-- ==============================================================================
-- SUPABASE DATABASE LINTER REMEDIATION SCRIPT
-- ==============================================================================
-- Resolves all 6 Supabase Database Linter issues:
--   1. policy_exists_rls_disabled (public.job_analysis)
--   2. security_definer_view (public.vw_decision_intelligence)
--   3. rls_disabled_in_public (public.job_analysis)
--   4. rls_disabled_in_public (public.resume_library)
--   5. rls_disabled_in_public (public.my_jobs)
--   6. rls_disabled_in_public (public.app_state)
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all flagged tables
ALTER TABLE public.job_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- 2. Fix View: vw_decision_intelligence (security_definer_view)
--    Enforce the querying user's permissions and RLS policies instead of the owner's
ALTER VIEW public.vw_decision_intelligence SET (security_invoker = true);

-- 3. Configure RLS Policies for public.job_analysis
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.job_analysis;
DROP POLICY IF EXISTS "Allow all access for all roles" ON public.job_analysis;
DROP POLICY IF EXISTS "Allow public read access" ON public.job_analysis;
DROP POLICY IF EXISTS "Allow public write access" ON public.job_analysis;

CREATE POLICY "Allow public read access" ON public.job_analysis
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access" ON public.job_analysis
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Configure RLS Policies for public.resume_library
DROP POLICY IF EXISTS "Allow all access for all roles" ON public.resume_library;
DROP POLICY IF EXISTS "Allow public read access" ON public.resume_library;
DROP POLICY IF EXISTS "Allow public write access" ON public.resume_library;

CREATE POLICY "Allow public read access" ON public.resume_library
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access" ON public.resume_library
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Configure RLS Policies for public.my_jobs
DROP POLICY IF EXISTS "Allow all access for all roles" ON public.my_jobs;
DROP POLICY IF EXISTS "Allow public read access" ON public.my_jobs;
DROP POLICY IF EXISTS "Allow public write access" ON public.my_jobs;

CREATE POLICY "Allow public read access" ON public.my_jobs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access" ON public.my_jobs
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Configure RLS Policies for public.app_state
DROP POLICY IF EXISTS "Allow all access for all roles" ON public.app_state;
DROP POLICY IF EXISTS "Allow public read access" ON public.app_state;
DROP POLICY IF EXISTS "Allow public write access" ON public.app_state;

CREATE POLICY "Allow public read access" ON public.app_state
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access" ON public.app_state
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
