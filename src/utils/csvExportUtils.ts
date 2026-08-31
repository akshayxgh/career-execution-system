import type { DecisionJob } from "../services/decisionIntelligenceService";
import { formatToISTShortDate, formatToISTDateTime } from "./dateUtils";

export function exportJobsToCSV(jobs: DecisionJob[], filenamePrefix: string = "decision_jobs") {
  if (!jobs || jobs.length === 0) return;

  const headers = [
    "Score",
    "Job Title",
    "Company",
    "Location",
    "Experience",
    "Salary",
    "Source",
    "Posted Date",
    "Analyzed At",
    "Status",
    "Job ID",
    "Job URL",
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = jobs.map((job) => [
    escapeCSV(job.score),
    escapeCSV(job.title),
    escapeCSV(job.company_name),
    escapeCSV(job.location || "—"),
    escapeCSV(job.experience || "—"),
    escapeCSV(job.salary || "—"),
    escapeCSV(job.scraper || job.source || "—"),
    escapeCSV(job.posted_date ? formatToISTShortDate(job.posted_date) : "—"),
    escapeCSV(job.analyzed_at ? formatToISTDateTime(job.analyzed_at) : "—"),
    escapeCSV(job.my_status),
    escapeCSV(job.external_id || job.id),
    escapeCSV(job.url),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
