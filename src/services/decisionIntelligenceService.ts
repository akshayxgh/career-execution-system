import { supabase } from "../lib/supabase";

export interface DecisionJob {
  id: string;
  external_id?: string | null;
  company_id: string | null;


  title: string;
  company_name: string;
  location: string | null;
  description: string | null;
  experience: string | null;
  salary: string | null;

  posted_date: string | null;
  created_at?: string | null;
  url: string;
  source: string;
  scraper?: string | null;
  search_keyword?: string | null;
  search_location?: string | null;


  score: number;
  recommendation: "Apply" | "Maybe";
  reason: string;
  recommended_resume?: string | null;
  recommended_master_resume?: string | null;

  email_to_hr: boolean;
  hr_email: string | null;
  confidence: string | number | null;
  analyzed_at: string;

  my_status: DecisionStatus;
  status_updated_at: string | null;
  resume?: any;
}

export type DecisionStatus =
  | "NEW"
  | "SAVED"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "JOINED"
  | "WITHDRAWN"
  | "DECLINED"
  | "HIDDEN";

export const decisionStatuses: DecisionStatus[] = [
  "NEW",
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "JOINED",
  "WITHDRAWN",
  "DECLINED",
  "HIDDEN",
];


const DECISION_JOBS_CACHE_KEY = "decision_jobs_cache";

export function getCachedDecisionJobs(): DecisionJob[] {
  try {
    const raw = localStorage.getItem(DECISION_JOBS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to read decision jobs cache:", e);
  }
  return [];
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    Promise.resolve(promise)
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function getDecisionJobs(): Promise<DecisionJob[]> {
  try {
    const query = supabase
      .from("vw_decision_intelligence")
      .select("*");

    const { data, error } = await withTimeout(
      query,
      9000,
      "Supabase query timed out. Retrying with cache..."
    );

    if (error) {
      throw error;
    }

    const jobs = (data ?? []) as DecisionJob[];

    if (jobs.length > 0) {
      // Chunk IDs to avoid huge URL length in PostgREST
      const allIds = jobs.map((j) => j.id).filter(Boolean);
      const chunkSize = 40;
      const chunks: string[][] = [];
      for (let i = 0; i < allIds.length; i += chunkSize) {
        chunks.push(allIds.slice(i, i + chunkSize));
      }

      const metaMap = new Map<string, string>();
      const resumeMap = new Map<string, any>();

      // Fetch metadata and analysis in parallel for chunks
      await Promise.allSettled(
        chunks.map(async (chunk) => {
          const [metaRes, analysisRes] = await Promise.allSettled([
            withTimeout(
              supabase.from("jobs").select("id, external_id").in("id", chunk),
              5000,
              "Meta query timeout"
            ),
            withTimeout(
              supabase.from("job_analysis").select("job_id, resume").in("job_id", chunk),
              5000,
              "Analysis query timeout"
            ),
          ]);

          if (metaRes.status === "fulfilled" && metaRes.value.data) {
            metaRes.value.data.forEach((row: any) => {
              if (row.external_id) metaMap.set(row.id, row.external_id);
            });
          }

          if (analysisRes.status === "fulfilled" && analysisRes.value.data) {
            analysisRes.value.data.forEach((row: any) => {
              if (row.resume) resumeMap.set(row.job_id, row.resume);
            });
          }
        })
      );

      jobs.forEach((job) => {
        if (metaMap.has(job.id)) job.external_id = metaMap.get(job.id) || null;
        if (resumeMap.has(job.id)) job.resume = resumeMap.get(job.id) || null;
      });
    }

    const sortedJobs = jobs.sort((a, b) => {
      // NEW always comes before SAVED
      if (a.my_status !== b.my_status) {
        return a.my_status === "NEW" ? -1 : 1;
      }

      // NEW -> newest posted job first (LIFO)
      if (a.my_status === "NEW") {
        const aDate = new Date(a.analyzed_at ?? 0).getTime();
        const bDate = new Date(b.analyzed_at ?? 0).getTime();
        return bDate - aDate;
      }

      // SAVED -> oldest saved first (FIFO)
      const aSaved = new Date(a.status_updated_at ?? 0).getTime();
      const bSaved = new Date(b.status_updated_at ?? 0).getTime();
      return aSaved - bSaved;
    });

    try {
      localStorage.setItem(DECISION_JOBS_CACHE_KEY, JSON.stringify(sortedJobs));
    } catch (cacheErr) {
      console.warn("Unable to save jobs to localStorage cache:", cacheErr);
    }

    return sortedJobs;
  } catch (err) {
    console.error("Failed to fetch fresh decision jobs:", err);
    const cached = getCachedDecisionJobs();
    if (cached.length > 0) {
      console.log(`[DecisionIntelligence] Serving ${cached.length} cached jobs due to network error/timeout.`);
      return cached;
    }
    throw err;
  }
}

export async function updateDecisionJobStatus(
  jobId: string,
  status: DecisionStatus,
  hideReason?: string,
) {
  const payload: Record<string, any> = {
    job_id: jobId,
    status,
    updated_at: new Date().toISOString(),
  };

  if (hideReason) {
    payload.notes = hideReason;
  }

  const { error } = await supabase
    .from("my_jobs")
    .upsert(payload, {
      onConflict: "job_id",
    });

  if (error) {
    throw error;
  }
}

export async function updateMultipleDecisionJobStatus(
  jobIds: string[],
  status: DecisionStatus,
  hideReason?: string,
) {
  if (!jobIds.length) return;

  const now = new Date().toISOString();
  const payloads = jobIds.map((jobId) => {
    const item: Record<string, any> = {
      job_id: jobId,
      status,
      updated_at: now,
    };
    if (hideReason) {
      item.notes = hideReason;
    }
    return item;
  });

  const { error } = await supabase
    .from("my_jobs")
    .upsert(payloads, {
      onConflict: "job_id",
    });

  if (error) {
    throw error;
  }
}



export interface AppliedJobFromDB {
  id: string;
  status: DecisionStatus;
  updated_at: string;
  job_id: string;
  jobs: {
    company_id: string | null;
    external_id?: string | null;
    title: string;

    company_name: string;
    location: string | null;
    description: string | null;
    experience: string | null;
    salary: string | null;
    posted_date: string | null;
    url: string;
    source: string;
    scraper: string | null;
    search_keyword: string | null;
    search_location: string | null;

    job_analysis: {
      score: number;
      reason: string;
      recommendation: string;
      email_to_hr: boolean;
      hr_email: string | null;
      confidence: string | null;
      analyzed_at: string;
    } | null;
  } | null;
}

export async function getAppliedJobs(): Promise<AppliedJobFromDB[]> {
  const { data, error } = await supabase
    .from("my_jobs")
    .select(`
      id,
      status,
      updated_at,
      job_id,
      jobs:jobs(
        company_id,
        external_id,
        title,
        company_name,
        location,
        description,
        experience,
        salary,
        posted_date,
        url,
        source,
        scraper,
        search_keyword,
        search_location,

        job_analysis:job_analysis(

          score,
          reason,
          recommendation,
          email_to_hr,
          hr_email,
          confidence,
          analyzed_at
        )
      )
    `)
    .in("status", ["APPLIED", "INTERVIEW", "OFFER", "REJECTED", "JOINED", "WITHDRAWN", "DECLINED"]);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as AppliedJobFromDB[];
}