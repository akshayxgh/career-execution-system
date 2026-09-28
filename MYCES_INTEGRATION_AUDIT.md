# MYCES Integration Audit: System Architecture & LinkedIn AI Agent Readiness

**Project:** Career Execution System (MYCES)  
**Date:** September 2026  
**Purpose:** Technical architecture audit to evaluate how MYCES stores user activity, learning, projects, podcasts, and personal context, and determine the cleanest design for integrating a future LinkedIn AI Agent.  
**Constraint Compliance:** No existing project files modified; zero secret values or tokens disclosed.

---

## 1. Executive Summary

MYCES is a personal career management and decision intelligence system designed for a single user (`USER_ID = "Akshay"`). It blends a Vite + React frontend with a Supabase PostgreSQL backend, Vercel serverless functions, and local browser persistence.

Data is divided across two storage patterns:
1. **Relational Database Tables & Views:** Used for the automated job ingestion pipeline, ATS application tracking (`my_jobs`, `jobs`, `job_analysis`, `vw_decision_intelligence`), document storage metadata (`documents`), master resumes (`resume_library`), and scraper analytics (`pipeline_daily_metrics`).
2. **Monolithic JSON Document Store (`app_state`):** User-generated context (concepts, podcasts, projects, study logs, learning tracks, question bank, interviews, weaknesses, and manual applications) is stored in a single JSON state tree inside `app_state` under `user_id = 'Akshay'`, synchronized bidirectionally between `localStorage` and Supabase.

---

## 2. Database Schema & Tables

### 2.1 Core Relational Tables & Views

| Table / View | Type | Primary Purpose | Key Columns |
| :--- | :--- | :--- | :--- |
| `app_state` | Table | Monolithic JSON document store for all personal user context and modules | `user_id` (PK, text), `data` (JSONB / JSON state object) |
| `jobs` | Table | Ingested job postings scraped from external platforms | `id`, `external_id`, `company_id`, `title`, `company_name`, `location`, `description`, `experience`, `salary`, `posted_date`, `url`, `source`, `scraper`, `search_keyword`, `search_location`, `created_at` |
| `job_analysis` | Table | AI-generated scoring, resume recommendations, and suitability analysis per job | `job_id` (FK -> `jobs.id`), `score`, `reason`, `recommendation`, `recommended_resume`, `recommended_master_resume`, `resume`, `email_to_hr`, `hr_email`, `confidence`, `analyzed_at` |
| `my_jobs` | Table | User-specific tracking status and notes for scraped jobs | `id`, `job_id` (FK -> `jobs.id`), `status` (`NEW`, `SAVED`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`, `JOINED`, `WITHDRAWN`, `DECLINED`, `HIDDEN`), `notes`, `updated_at` |
| `resume_library` | Table | Master resume repository metadata for matching engines | `id`, `resume_name`, `role_keywords`, `focus_keywords`, `priority`, `active`, `created_at`, `updated_at` |
| `documents` | Table | Metadata index of uploaded personal documents and certificates | `id`, `user_id`, `name`, `document_number`, `issue_date`, `storage_path`, `file_name`, `file_size`, `mime_type`, `created_at` |
| `pipeline_daily_metrics` | Table | Scraper aggregation analytics (yields, conversion rates, counts) | `id`, `metric_date`, `category`, `source`, `source_key`, `scraped`, `deduplicated`, `filtered`, `analyzed`, `apply_matches`, `maybe_review`, `skipped`, `high_value_60plus`, `avg_score`, `conversion_pct`, `updated_at` |
| `companies` / `scrape_runs` | Table | Upstream scraper metadata tables | System-level run logs and company records |
| `vw_decision_intelligence` | View | Security-invoker view joining `jobs`, `job_analysis`, and `my_jobs` | Unified job feed filtered for AI-recommended opportunities |

### 2.2 Supabase Storage Buckets
* `documents`: Stores personal identification and career documents organized under `${USER_ID}/${timestamp}-${filename}`.
* `resume-library`: Stores master DOCX/PDF resume assets matching names in `resume_library`.

---

## 3. Stored User & Activity Data (`app_state.data`)

All personal activities and knowledge assets are held in `app_state.data` (`StoreState`). The following records are available:

1. **Concepts & Audio / Podcasts (`concepts: Concept[]`):**
   * Fields: `id`, `name`, `learningDate`, `status` (`Planned`, `In Progress`, `Completed`), `notebookLmResearchLink`, **`notebookLmAudioLink`** (link to the generated NotebookLM podcast audio), **`linkedinPostLink`** (link to the published LinkedIn post), `notes` (Markdown), `interviewQuestions` (`question`, `answer`).
   * *Relevance for LinkedIn Agent:* Direct source of technical topics mastered, podcast summaries, and tracking which concepts have already been published vs. need a LinkedIn post.
2. **Projects (`projects: Project[]`):**
   * Fields: `id`, `name`, `category`, `startDate`, `targetCompletionDate`, `status` (`Idea`, `Planning`, `Building`, `Testing`, `Completed`, `Published`), `technologiesUsed` (`string[]`), `githubLink`, `portfolioLink`, `resources`, `lessonsLearned`.
   * *Relevance for LinkedIn Agent:* Provides project milestones, tech stack narratives, and lessons learned for showcase posts.
3. **Learning Tracks & Study Logs (`learningTracks: LearningTrack[]`, `studyLogs: StudyLog[]`):**
   * Fields: Modules categorized under tracks (Power BI, SQL, Python for Analytics) with progress statuses (`Not Started`, `Learning`, `Practicing`, `Interview Ready`, `Mastered`).
   * Study logs: `date`, `subject`, `topic`, `plannedHours`, `actualHours`, `confidenceScore` (1-10), `notes`, `completed`.
   * *Relevance for LinkedIn Agent:* Provides daily learning streaks, exam preparation updates (e.g., PL-300), and study metrics.
4. **Question Bank (`questionBank: QuestionBankItem[]`):**
   * Fields: `question`, `company`, `tool`, `role`, `topic`, `tags`, `aliases`, `difficulty`, `humanAnswer` (`pitch`, `steps`, `proTip`, `codeSnippet`), `confidence`, `frequencyCount`, `companiesAsked`.
   * *Relevance for LinkedIn Agent:* Rich repository of practical technical tips, code recipes, and interview insights suitable for "carousels" or educational posts.
5. **Interview Logs & Weaknesses (`interviews: Interview[]`, `weaknesses: Weakness[]`):**
   * Fields: Company, round, questions asked, answers given, mistakes made, lessons learned, confidence ratings, and identified knowledge gaps with resolution plans.
6. **Applications (`applications: JobApplication[]`):**
   * Manual job applications with recruiters, dates, salary, notes, and priority levels.
7. **Skill Assessments & Settings (`skillAssessments: SkillAssessment[]`, `settings: UserSettings`):**
   * Monthly ratings for Power BI, SQL, Python, Excel, VBA, communication, and target dates.

---

## 4. Authentication & Security Model

### 4.1 Application Authentication
* **Implementation:** Minimal single-password barrier implemented via Vercel Serverless Functions (`api/login.js`, `api/session.js`, `api/logout.js`, `api/_auth.js`).
* **Session Mechanism:**
  * Client sends POST to `/api/login` with `{ password }`.
  * Compared using Node.js `crypto.timingSafeEqual` against server environment variable `APP_PASSWORD`.
  * On success, sets an HTTP-only, secure, same-site cookie `myces_session` containing a Base64-encoded payload `{ exp: timestamp }` and HMAC-SHA256 signature (`AUTH_SECRET || APP_PASSWORD`).
  * `ProtectedRoute.tsx` verifies session status via `GET /api/session`.
  * Local development automatically bypasses verification unless `VITE_DEV_AUTH_BYPASS === 'false'`.
* **User Accounts:** No multi-tenant user database or identity provider (no OAuth, no Supabase Auth, no user registration).

### 4.2 Database Security & Access Model
* Client connects to Supabase directly via `supabase-js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* In `supabase/fix_supabase_issues.sql`, Row Level Security (RLS) is enabled on tables (`job_analysis`, `resume_library`, `my_jobs`, `app_state`), but the active policies grant read/write to `anon` and `authenticated`:
  ```sql
  CREATE POLICY "Allow public read access" ON public.app_state FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "Allow public write access" ON public.app_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  ```
* All user records are keyed to the hardcoded literal `const USER_ID = "Akshay";`.

---

## 5. Existing API & Server Functions

### 5.1 Vercel Serverless Endpoints (`/api`)
1. `POST /api/login`: Validates the master password and sets `myces_session` cookie.
2. `GET /api/session`: Reads `myces_session` cookie, verifies cryptographic signature, returns `{ authenticated: boolean }`.
3. `GET /api/logout` (default handler): Clears the `myces_session` cookie.

### 5.2 Standalone Node.js Scripts (`scripts/`)
* `scripts/auto_enrich_agent.js`: An autonomous background script that connects directly to Supabase (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`), reads `app_state.data.questionBank`, prompts OpenRouter/Gemini for interview answers, and upserts the result back to `app_state`.
* *Significance:* This script serves as a working reference implementation for how an autonomous external agent interacts with MYCES.

---

## 6. External Access Evaluation

### Question: Can an external application securely request MYCES data for the authenticated user?

**Current State: No standard delegated API access exists, but direct database access is straightforward.**
* **No OAuth / Bearer Token Gateway:** MYCES does not currently expose REST API endpoints with Bearer token authentication or API keys for third-party consumers. The `/api/*` endpoints only support browser cookies with `SameSite=Lax`.
* **Database-Level Access:** Because Supabase is the primary datastore and configured with public anon policies (or service role access), any external program possessing the project's Supabase URL and key can read and write `app_state` directly.
* **Concurrency Risk:** Because `app_state` stores the entire state object as a single JSON blob, simultaneous updates from both the frontend (which auto-saves every 1 second) and an external agent directly writing to `app_state` can lead to race conditions and overwrites.

---

## 7. Cleanest Integration Architecture for Future LinkedIn AI Agent

To enable a LinkedIn AI Agent to read concepts, podcasts, and project data and publish or draft LinkedIn content, two clean architectural patterns are available:

### Recommended Option: Dedicated Agent Serverless API (`/api/agent/*`)
Rather than having the LinkedIn agent directly parse and mutate the monolithic `app_state` JSON blob, introduce lightweight serverless endpoints in `api/`:

1. **Authentication:**
   * Require an `X-Agent-Key` or `Authorization: Bearer <AGENT_SECRET>` header verified against a server environment variable (`MYCES_AGENT_SECRET`).
2. **Read Endpoint (`GET /api/agent/context`):**
   * Reads `app_state` from Supabase server-side.
   * Returns a clean, filtered JSON payload containing:
     * Unposted concepts (`concepts.filter(c => !c.linkedinPostLink)`), including `name`, `notes`, `notebookLmResearchLink`, and `notebookLmAudioLink`.
     * Recent projects with status `Completed` or `Published` and their `lessonsLearned`.
     * High-confidence question bank items with practitioner `humanAnswer` pitches and code snippets.
     * Current study streak and weekly learning hours.
3. **Write Endpoint (`POST /api/agent/publish-status`):**
   * Accepts `{ conceptId, linkedinPostUrl }`.
   * Safely updates only the specified concept's `linkedinPostLink` in `app_state` without risking frontend state overwrites.

### Direct Alternative: Autonomous Supabase Script (Pattern from `auto_enrich_agent.js`)
If running the LinkedIn agent as a standalone local/server script:
* Connect directly via `@supabase/supabase-js` or Python `supabase-py`.
* Query `app_state` for `user_id = 'Akshay'`.
* Read `data.concepts`, `data.projects`, and `data.studyLogs`.
* To avoid stomping frontend changes, always re-fetch `app_state` immediately before persisting updates back.

---

## 8. Environment Variables & External Services (Redacted)

| Variable Name | Context | Service / Role |
| :--- | :--- | :--- |
| `APP_PASSWORD` | Server / Vercel | Single gatekeeper password for unlocking MYCES UI |
| `AUTH_SECRET` | Server / Vercel | HMAC signing secret for session cookies |
| `VITE_SUPABASE_URL` | Frontend & Scripts | Supabase project instance URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend & Scripts | Supabase anonymous public API key |
| `VITE_DEV_AUTH_BYPASS` | Frontend (Local dev) | Development flag to bypass `/api/session` check |
| `VITE_GEMINI_API_KEY` | Frontend / Copilot | Google Gemini API key for multimodal reasoning |
| `VITE_GROQ_API_KEY` | Frontend / Copilot | Groq API key for ultra-fast text reasoning |
| `VITE_OPENROUTER_API_KEY` | Scripts / Enricher | OpenRouter API key for autonomous background tasks |
| `VITE_OPENROUTER_MODEL` | Scripts / Enricher | Model identifier for OpenRouter calls |
| `VITE_APPWRITE_ENDPOINT` | Local env | Appwrite configuration (unused in active codebase) |
| `VITE_APPWRITE_PROJECT_ID` | Local env | Appwrite project identifier (unused in active codebase) |

---

## 9. Key File Index

* **Authentication & Backend API:**
  * `api/_auth.js`: Cookie signing, HMAC verification, password comparison.
  * `api/login.js`: Login handler.
  * `api/session.js`: Session validation handler.
  * `api/logout.js`: Session termination.
  * `src/components/ProtectedRoute.tsx`: Client-side route protection.
* **Database & Storage Services:**
  * `supabase/fix_supabase_issues.sql`: RLS definitions for tables and security-invoker view.
  * `src/lib/supabase.ts`: Supabase client initialization.
  * `src/services/cloudStorage.ts`: `loadState()` and `saveState()` operations on `app_state`.
  * `src/services/documentService.ts`: File upload and retrieval via `documents` bucket.
  * `src/services/resumeRecommendationService.ts`: Queries `resume_library`.
  * `src/services/decisionIntelligenceService.ts`: Queries `vw_decision_intelligence` and updates `my_jobs`.
* **State & Data Views:**
  * `src/store/StoreContext.tsx`: Master state provider and cloud synchronization loop.
  * `src/types/index.ts`: TypeScript interfaces for all entities (`Concept`, `Project`, `StoreState`, etc.).
  * `src/views/ConceptLibrary.tsx`: UI for concepts, NotebookLM podcasts, and LinkedIn post links.
  * `src/views/ProjectTracker.tsx`: UI for project tracking and tech stack management.
  * `src/views/LearningTracks.tsx`: UI for study logs, learning tracks, and streaks.
  * `scripts/auto_enrich_agent.js`: Reference script for external agent database access.
