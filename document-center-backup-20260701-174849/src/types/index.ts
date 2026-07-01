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

export interface StoreState {
  applications: JobApplication[];
  interviews: Interview[];
  weaknesses: Weakness[];
  studyLogs: StudyLog[];
  projects: Project[];
  resumes: Resume[];
  skillAssessments: SkillAssessment[];
  settings: UserSettings;
  learningTracks: LearningTrack[];
}
