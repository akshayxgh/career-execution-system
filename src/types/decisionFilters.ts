export type FilterColumnKey =
  | "score"
  | "jobTitle"
  | "location"
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
  location: string;
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
  location: "",
  experience: "",
  salary: "",
  postedDates: [],
  analyzedDates: [],
  scrapers: [],
  statuses: [],
};
