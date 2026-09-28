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

export interface LinkedInActionPayload {
  topic?: string;
  content: string;
  concept_id?: string | null;
  tags?: string[];
  target_url?: string;
  recipient_profile_url?: string;
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
}
