export type ActionType =
  | 'PUBLISH_POST'
  | 'SEND_CONNECTION'
  | 'COMMENT'
  | 'REPLY'
  | 'MESSAGE'
  | 'LIKE'
  | 'FOLLOW'
  | 'FOLLOW_UP';

export type ActionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'READY_FOR_MANUAL'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED';

export type PostStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'ARCHIVED';

export type ConnectionStatus =
  | 'NOT_CONNECTED'
  | 'PENDING_OUTREACH'
  | 'INVITATION_SENT'
  | 'CONNECTED';

export interface LinkedInPerson {
  id: string;
  user_id: string;
  full_name: string;
  profile_url: string;
  headline?: string | null;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  connection_status: ConnectionStatus;
  interaction_notes?: string | null;
  tags?: string[];
  last_interaction_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type OpportunityType =
  | 'JOB_POSTING'
  | 'HIRING_MANAGER_POST'
  | 'CONSULTING'
  | 'NETWORKING';

export type OpportunityStatus =
  | 'NEW'
  | 'EVALUATING'
  | 'ACTION_PROPOSED'
  | 'PURSUING'
  | 'CLOSED'
  | 'ARCHIVED';

export interface LinkedInOpportunity {
  id: string;
  user_id: string;
  title: string;
  company: string;
  opportunity_type: OpportunityType;
  source_url: string;
  contact_person_id?: string | null;
  description?: string | null;
  status: OpportunityStatus;
  score?: number | null;
  created_at: string;
  updated_at: string;
  contact_person?: LinkedInPerson | null;
}

export interface LinkedInActionPayload {
  topic?: string;
  content: string;
  concept_id?: string | null;
  tags?: string[];
  target_url?: string;
  post_url?: string;
  recipient_name?: string;
  recipient_role?: string;
  company?: string;
  recipient_profile_url?: string;
  person_id?: string | null;
  opportunity_id?: string | null;
  [key: string]: unknown;
}

export interface LinkedInAction {
  id: string;
  user_id: string;
  action_type: ActionType;
  status: ActionStatus;
  payload: LinkedInActionPayload;
  reasoning: string;
  target_id?: string | null;
  proposed_by: string;
  reviewed_at?: string | null;
  executed_at?: string | null;
  execution_error?: string | null;
  execution_method?: 'MANUAL_FALLBACK' | 'API' | null;
  created_at: string;
  updated_at: string;
}

export interface ContentContextConcept {
  id: string;
  name: string;
  status: string;
  notes: string;
  notebookLmAudioLink: string;
  notebookLmResearchLink: string;
  linkedinPostLink: string;
  learningDate: string;
  hasPost: boolean;
}

export interface ContentContextProject {
  id: string;
  name: string;
  category: string;
  status: string;
  technologiesUsed: string[];
  lessonsLearned: string;
  githubLink: string;
  portfolioLink: string;
}

export interface ContentContextLearning {
  name: string;
  masteredModules: string[];
  inProgressModules: string[];
}

export interface AgentContentContext {
  concepts: ContentContextConcept[];
  projects: ContentContextProject[];
  learning: ContentContextLearning[];
  memories?: LinkedInAgentMemory[];
}

export interface AgentNetworkingContext {
  targetRoles: string[];
  targetCompanies: string[];
  skills: string[];
  projects: ContentContextProject[];
  people: LinkedInPerson[];
  opportunities: LinkedInOpportunity[];
  memories?: LinkedInAgentMemory[];
}

export type AgentMemoryType =
  | 'AUDIENCE_PREFERENCE'
  | 'TOPIC_PERFORMANCE'
  | 'WRITING_STYLE_GUIDE'
  | 'OUTREACH_STRATEGY'
  | 'LESSON_LEARNED';

export interface LinkedInAgentMemory {
  id: string;
  user_id: string;
  memory_type: AgentMemoryType;
  key: string;
  value: Record<string, unknown> | string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedInAnalyticsSnapshot {
  id: string;
  user_id: string;
  metric_date: string;
  profile_views: number;
  search_appearances: number;
  post_impressions: number;
  total_reactions: number;
  total_comments: number;
  followers_count?: number | null;
  connections_count?: number | null;
  summary_metrics?: Record<string, unknown> | null;
  created_at: string;
}

export interface AnalyticsDashboardSummary {
  totalPostsPublished: number;
  totalConnectionRequestsSent: number;
  totalConnectionsMade: number;
  outreachConversionRate: number;
  totalEngagements: number;
  totalOpportunitiesTracked: number;
  activeOpportunities: number;
  snapshots: LinkedInAnalyticsSnapshot[];
  memories: LinkedInAgentMemory[];
}
