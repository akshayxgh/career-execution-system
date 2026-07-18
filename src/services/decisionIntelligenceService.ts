import { supabase } from "../lib/supabase";

export interface DecisionJob {
  id: string;
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
  search_keyword?: string | null;
  search_location?: string | null;

  score: number;
  recommendation: "Apply" | "Maybe";
  reason: string;
  recommended_resume?: string | null;
  recommended_master_resume?: string | null;

  email_to_hr: boolean;
  hr_email: string | null;
  confidence: number | null;
  analyzed_at: string;

  my_status: DecisionStatus;
  status_updated_at: string | null;
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
) {
  const { error } = await supabase
    .from("vw_decision_intelligence")
    .update({
      my_status: status,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}
