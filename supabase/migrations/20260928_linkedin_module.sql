-- ==============================================================================
-- MYCES LINKEDIN AGENT MODULE MIGRATION
-- Migration: 20260928_linkedin_module.sql
-- Description: Creates the 7 dedicated LinkedIn tables, indexes, RLS enforcement,
--              and atomic concept update helper.
-- Security: RLS is strictly ENABLED. No public anon access is granted.
--           Only the server-side service role client can query/modify these tables.
-- ==============================================================================

-- 1. linkedin_posts
CREATE TABLE IF NOT EXISTS public.linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  concept_id TEXT, -- Soft reference to concept in app_state (if derived)
  project_id TEXT, -- Soft reference to project in app_state (if derived)
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  post_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' 
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  media_urls TEXT[],
  tags TEXT[],
  metrics JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "impressions": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. linkedin_people
CREATE TABLE IF NOT EXISTS public.linkedin_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  full_name TEXT NOT NULL,
  profile_url TEXT NOT NULL UNIQUE,
  headline TEXT,
  company TEXT,
  role TEXT,
  location TEXT,
  connection_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED' 
    CHECK (connection_status IN ('NOT_CONNECTED', 'PENDING_OUTREACH', 'INVITATION_SENT', 'CONNECTED')),
  interaction_notes TEXT,
  tags TEXT[],
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. linkedin_opportunities
CREATE TABLE IF NOT EXISTS public.linkedin_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  opportunity_type TEXT NOT NULL 
    CHECK (opportunity_type IN ('JOB_POSTING', 'HIRING_MANAGER_POST', 'CONSULTING', 'NETWORKING')),
  source_url TEXT NOT NULL,
  contact_person_id UUID REFERENCES public.linkedin_people(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' 
    CHECK (status IN ('NEW', 'EVALUATING', 'ACTION_PROPOSED', 'PURSUING', 'CLOSED', 'ARCHIVED')),
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. linkedin_actions (Core Human-in-the-Loop decision queue)
CREATE TABLE IF NOT EXISTS public.linkedin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  action_type TEXT NOT NULL 
    CHECK (action_type IN (
      'PUBLISH_POST', 
      'SEND_CONNECTION', 
      'COMMENT', 
      'REPLY', 
      'MESSAGE', 
      'LIKE', 
      'FOLLOW', 
      'FOLLOW_UP'
    )),
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' 
    CHECK (status IN (
      'PENDING_APPROVAL', 
      'APPROVED', 
      'REJECTED', 
      'EXECUTING', 
      'READY_FOR_MANUAL', 
      'EXECUTED', 
      'FAILED', 
      'EXPIRED'
    )),
  payload JSONB NOT NULL,       -- Contains post content, target URL, recipient info, etc.
  reasoning TEXT NOT NULL,     -- AI explanation for proposing this action
  target_id UUID,              -- Soft FK link to linkedin_posts, linkedin_people, or opportunities
  proposed_by TEXT NOT NULL DEFAULT 'linkedin_agent',
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  execution_error TEXT,
  execution_method TEXT CHECK (execution_method IN ('MANUAL_FALLBACK', 'API')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. linkedin_engagements
CREATE TABLE IF NOT EXISTS public.linkedin_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  post_id UUID REFERENCES public.linkedin_posts(id) ON DELETE SET NULL,
  person_id UUID REFERENCES public.linkedin_people(id) ON DELETE SET NULL,
  engagement_type TEXT NOT NULL 
    CHECK (engagement_type IN ('COMMENT', 'LIKE', 'MESSAGE_EXCHANGE', 'INMAIL')),
  content TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. linkedin_analytics (Durable Metric Snapshots)
CREATE TABLE IF NOT EXISTS public.linkedin_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  metric_date DATE NOT NULL,
  profile_views INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  post_impressions INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  followers_count INTEGER,
  connections_count INTEGER,
  summary_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, metric_date)
);

-- 7. linkedin_agent_memory (Durable Strategic Memory)
CREATE TABLE IF NOT EXISTS public.linkedin_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'Akshay',
  memory_type TEXT NOT NULL 
    CHECK (memory_type IN (
      'AUDIENCE_PREFERENCE', 
      'TOPIC_PERFORMANCE', 
      'WRITING_STYLE_GUIDE', 
      'OUTREACH_STRATEGY', 
      'LESSON_LEARNED'
    )),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, memory_type, key)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_linkedin_actions_status ON public.linkedin_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_linkedin_actions_created ON public.linkedin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status ON public.linkedin_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_created ON public.linkedin_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_people_active ON public.linkedin_people(last_interaction_at DESC);

-- Enable Row Level Security (RLS) on all 7 tables
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_agent_memory ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke public anon access.
-- Zero public policies are created. Under Postgres RLS, without policies,
-- all queries by 'anon' or 'authenticated' are DENIED by default.
-- Only the server-side 'service_role' (which bypasses RLS) has access.
REVOKE ALL ON public.linkedin_posts FROM anon;
REVOKE ALL ON public.linkedin_people FROM anon;
REVOKE ALL ON public.linkedin_opportunities FROM anon;
REVOKE ALL ON public.linkedin_actions FROM anon;
REVOKE ALL ON public.linkedin_engagements FROM anon;
REVOKE ALL ON public.linkedin_analytics FROM anon;
REVOKE ALL ON public.linkedin_agent_memory FROM anon;

-- Atomic helper function to update linkedinPostLink inside app_state.data->'concepts'
-- Uses SECURITY DEFINER to execute safely without exposing table writes to client.
CREATE OR REPLACE FUNCTION public.update_concept_linkedin_link(
  p_user_id TEXT,
  p_concept_id TEXT,
  p_linkedin_url TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_concepts JSONB;
  v_updated_concepts JSONB;
BEGIN
  SELECT data->'concepts' INTO v_concepts
  FROM public.app_state
  WHERE user_id = p_user_id;

  IF v_concepts IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'id' = p_concept_id THEN jsonb_set(elem, '{linkedinPostLink}', to_jsonb(p_linkedin_url))
      ELSE elem 
    END
  )
  INTO v_updated_concepts
  FROM jsonb_array_elements(v_concepts) AS elem;

  UPDATE public.app_state
  SET data = jsonb_set(data, '{concepts}', v_updated_concepts)
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
