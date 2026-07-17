import { Mail } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface Props {
  job: DecisionJob;
}

const rowColor = (rec: string) =>
  rec === "Apply"
    ? "bg-green-50 hover:bg-green-100"
    : "bg-amber-50 hover:bg-amber-100";

const badgeColor = (score: number) => {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-blue-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "-";

export default function DecisionJobRow({ job }: Props) {
  return (
    <div
      onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
      className={`grid grid-cols-[70px_3fr_2fr_110px_140px_140px_90px] items-center gap-4 border-b border-gray-200 px-4 py-3 cursor-pointer transition ${rowColor(job.recommendation)}`}
    >
      <div className="flex justify-center">
        <div
          className={`h-11 w-11 rounded-full ${badgeColor(
            job.score
          )} flex items-center justify-center text-white font-bold shadow`}
        >
          {job.score}
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {job.email_to_hr && (
          <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
        )}
        <span className="truncate font-medium">{job.title}</span>
      </div>

      <div className="truncate">{job.company_name}</div>

      <div>{fmt(job.posted_date)}</div>

      <div>{job.salary || "-"}</div>

      <div onClick={(e) => e.stopPropagation()}>
        <select
          defaultValue={job.my_status}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option>NEW</option>
          <option>SAVED</option>
          <option>HIDDEN</option>
          <option>APPLIED</option>
        </select>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <button className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800">
          View
        </button>
      </div>
    </div>
  );
}
