export type ApplicationStatus = 'Saved' | 'Applied' | 'Screening' | 'Assessment' | 'Interview Scheduled' | 'Interview Completed' | 'Rejected' | 'Offer Received' | 'Joined';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  location: string;
  salary: string;
  appliedDate: string; // ISO date string
  jobLink: string;
  recruiterName: string;
  recruiterContact: string;
  status: ApplicationStatus;
  notes: string;
  followUpDate?: string;
  lastContactDate?: string;
  nextAction: string;
  priorityLevel: PriorityLevel;
  source?: string;
  score?: number;
}

export interface Interview {
  id: string;
  company: string;
  date: string;
  round: string;
  questionsAsked: string[];
  answersGiven: string[];
  mistakesMade: string[];
  correctAnswers: string[];
  lessonsLearned: string[];
  confidenceRating: number; // 1-10
}

export type WeaknessStatus = 'Open' | 'Learning' | 'Fixed' | 'Mastered';

export interface Weakness {
  id: string;
  topic: string;
  interviewCompany: string;
  dateIdentified: string;
  description: string;
  resolutionPlan: string;
  status: WeaknessStatus;
}

export interface StudyLog {
  id: string;
  date: string;
  subject: string;
  topic: string;
  plannedHours: number;
  actualHours: number;
  confidenceScore: number; // 1-10
  notes: string;
  completed: boolean;
}

export type ProjectStatus = 'Idea' | 'Planning' | 'Building' | 'Testing' | 'Completed' | 'Published';

export interface Project {
  id: string;
  name: string;
  category: string;
  startDate: string;
  targetCompletionDate: string;
  status: ProjectStatus;
  technologiesUsed: string[];
  githubLink: string;
  portfolioLink: string;
  resources?: string[];
  lessonsLearned: string;
}

export interface Resume {
  id: string;
  versionName: string;
  roleTargeted: string;
  dateCreated: string;
  lastUpdated: string;
  notes: string;
}

export interface DocumentRecord {
  id: string;
  docName: string;
  documentNo: string;
  issueDate?: string;
  storagePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

export interface SkillAssessment {
  id: string;
  date: string; // YYYY-MM
  powerBi: number;
  sql: number;
  python: number;
  excel: number;
  vba: number;
  communication: number;
  interviewSkills: number;
}

export interface UserSettings {
  pl300TargetDate: string | null;
  aiApiKey?: string;
  aiProvider?: string;
}

export type TrackStatus = 'Not Started' | 'Learning' | 'Practicing' | 'Interview Ready' | 'Mastered';

export interface TrackModule {
  id: string;
  name: string;
  status: TrackStatus;
}

export interface LearningTrack {
  id: string;
  name: string;
  modules: TrackModule[];
}

export type ConceptStatus = 'Planned' | 'In Progress' | 'Completed';

export interface Concept {
  id: string;
  name: string;
  learningDate: string; // YYYY-MM-DD
  status: ConceptStatus;
  notebookLmResearchLink: string;
  notebookLmAudioLink: string;
  linkedinPostLink: string;
  notes: string;
  interviewQuestion?: string; // Legacy fallback
  interviewQuestions?: { question: string; answer: string }[];
}

export type QuestionEnrichmentStatus = 'pending' | 'enriching' | 'completed';
export type QuestionConfidence = 'unseen' | 'struggled' | 'hesitant' | 'mastered';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface HumanAnswer {
  pitch: string;          // 30-second verbal pitch (how to say it out loud)
  steps: string[];        // Step-by-step execution or DAX/SQL recipe
  proTip: string;         // Senior gotcha / bonus point / performance nuance
  codeSnippet?: string;   // Optional DAX / SQL / Python snippet
}

export interface QuestionBankItem {
  id: string;
  question: string;
  company: string;
  tool?: string;          // e.g. 'Power BI', 'SQL', 'Python', 'Fabric', 'Excel', 'General'
  role: string;
  topic: string;
  tags: string[];
  aliases?: string[];     // Alternative phrasing or question variations merged from duplicate posts
  difficulty: QuestionDifficulty;
  humanAnswer?: HumanAnswer;
  rawSource?: string;
  enrichmentStatus: QuestionEnrichmentStatus;
  confidence: QuestionConfidence;
  frequencyCount: number;
  companiesAsked: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreState {
  applications: JobApplication[];
  interviews: Interview[];
  weaknesses: Weakness[];
  studyLogs: StudyLog[];
  projects: Project[];
  resumes: Resume[];
  documents: DocumentRecord[];
  skillAssessments: SkillAssessment[];
  settings: UserSettings;
  learningTracks: LearningTrack[];
  concepts: Concept[];
  questionBank: QuestionBankItem[];
}
