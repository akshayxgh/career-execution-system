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
  url: string;
  source: string;

  score: number;
  recommendation: "Apply" | "Maybe";
  reason: string;

  email_to_hr: boolean;
  hr_email: string | null;
  confidence: number | null;
  analyzed_at: string;

  my_status: "NEW" | "SAVED";
  status_updated_at: string | null;
}

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
      const aDate = new Date(a.posted_date ?? 0).getTime();
      const bDate = new Date(b.posted_date ?? 0).getTime();

      return bDate - aDate;
    }

    // SAVED -> oldest saved first (FIFO)
    const aSaved = new Date(a.status_updated_at ?? 0).getTime();
    const bSaved = new Date(b.status_updated_at ?? 0).getTime();

    return aSaved - bSaved;
  });
}