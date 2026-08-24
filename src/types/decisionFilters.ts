export type FilterColumnKey =
  | "score"
  | "jobTitle"
  | "posted"
  | "analyzed"
  | "scraper"
  | "experience"
  | "salary"
  | "status";

export interface ColumnFiltersState {
  scoreMin: string;
  scoreMax: string;
  jobTitle: string;
  experience: string;
  salary: string;
  postedDates: string[];
  analyzedDates: string[];
  scrapers: string[];
  statuses: string[];
}

export const initialColumnFilters: ColumnFiltersState = {
  scoreMin: "",
  scoreMax: "",
  jobTitle: "",
  experience: "",
  salary: "",
  postedDates: [],
  analyzedDates: [],
  scrapers: [],
  statuses: [],
};
