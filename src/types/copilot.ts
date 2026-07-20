import type { DecisionJob } from "../services/decisionIntelligenceService";

export interface CurrentJobContext {
  id: string;
  title: string;
  companyName: string;
  description: string | null;
  url: string;
  source: string;
  location: string | null;
  experience: string | null;
  salary: string | null;
  postedDate: string | null;
  searchKeyword: string | null;
  
  aiScore: number;
  aiRecommendation: string;
  aiReason: string;
  
  hrEmail: string | null;
  emailToHr: boolean;
  
  recommendedResumeName: string | null;
  resumeRecommendationReason: string | null;
  
  // Future fields (e.g. resumeJson, userProfile, previousApplications, etc.)
}

export function buildJobContext(job: DecisionJob): CurrentJobContext {
  return {
    id: job.id,
    title: job.title,
    companyName: job.company_name,
    description: job.description,
    url: job.url,
    source: job.source,
    location: job.location,
    experience: job.experience,
    salary: job.salary,
    postedDate: job.posted_date,
    searchKeyword: job.search_keyword ?? null,
    
    aiScore: job.score,
    aiRecommendation: job.recommendation,
    aiReason: job.reason,
    
    hrEmail: job.hr_email,
    emailToHr: job.email_to_hr,
    
    recommendedResumeName: job.resume?.recommended?.name ?? null,
    resumeRecommendationReason: job.resume?.reason ?? null,
  };
}
