import { Mail } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface Props {
  job: DecisionJob;
}

function scoreColor(score: number) {
  if (score >= 90) return "bg-green-600 text-white";
  if (score >= 75) return "bg-blue-600 text-white";
  if (score >= 60) return "bg-yellow-500 text-white";
  return "bg-red-600 text-white";
}

function rowColor(recommendation: string) {
  return recommendation === "Apply"
    ? "bg-green-50 hover:bg-green-100"
    : "bg-yellow-50 hover:bg-yellow-100";
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DecisionJobRow({ job }: Props) {
  return (
    <div
      onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
      className={`grid grid-cols-[90px_3fr_2fr_120px_120px_160px_90px]
      items-center gap-4 rounded-lg border border-gray-200 px-4 py-3
      cursor-pointer transition ${rowColor(job.recommendation)}`}
    >
      <div className="flex justify-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${scoreColor(
            job.score
          )}`}
        >
          {job.score}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 font-semibold">
          {job.email_to_hr && <Mail className="h-4 w-4 text-blue-600" />}
          <span>{job.title}</span>
        </div>
      </div>

      <div>{job.company_name}</div>

      <div>{formatDate(job.posted_date)}</div>

      <div>{job.salary || "-"}</div>

      <div onClick={(e) => e.stopPropagation()}>
        <select
          defaultValue={job.my_status}
          className="w-full rounded-md border px-2 py-1 text-sm"
        >
          <option value="NEW">NEW</option>
          <option value="SAVED">SAVED</option>
          <option value="HIDDEN">HIDDEN</option>
          <option value="APPLIED">APPLIED</option>
        </select>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <button
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
          onClick={() => {
            // TODO: Navigate to /decision/:jobId
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}
