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


export async function getDecisionJobs(): Promise<DecisionJob[]> {
  const { data, error } = await supabase
    .from("vw_decision_intelligence")
    .select("*");

  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as DecisionJob[];

  if (jobs.length > 0) {
    try {
      const { data: jobMeta, error: metaErr } = await supabase

        .from("jobs")
        .select("id, external_id")
        .in("id", jobs.map(j => j.id));

      if (!metaErr && jobMeta) {
        const metaMap = new Map<string, string>();
        jobMeta.forEach(row => {
          if (row.external_id) metaMap.set(row.id, row.external_id);
        });

        jobs.forEach(job => {
          job.external_id = metaMap.get(job.id) || null;
        });
      }

      const { data: analysisData, error: analysisErr } = await supabase
        .from("job_analysis")
        .select("job_id, resume")
        .in("job_id", jobs.map(j => j.id));

      if (!analysisErr && analysisData) {
        const resumeMap = new Map<string, any>();
        analysisData.forEach(row => {
          resumeMap.set(row.job_id, row.resume);
        });

        jobs.forEach(job => {
          job.resume = resumeMap.get(job.id) || null;
        });
      }
    } catch (e) {
      console.error("Failed to merge job metadata inside getDecisionJobs:", e);
    }

  }

  return jobs.sort((a, b) => {
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