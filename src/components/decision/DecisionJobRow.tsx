import { ExternalLink, Mail } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";
import ScoreBadge from "./ScoreBadge";
import StatusDropdown from "./StatusDropdown";

interface DecisionJobRowProps {
  job: DecisionJob;
  columnClass: string;
}

function formatPostedDate(postedDate: string | null) {
  if (!postedDate) {
    return "-";
  }

  const date = new Date(postedDate);

  if (Number.isNaN(date.getTime())) {
    return postedDate;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function DecisionJobRow({ job, columnClass }: DecisionJobRowProps) {
  const rowTone =
    job.recommendation === "Apply"
      ? "bg-emerald-950/30 hover:bg-emerald-900/35"
      : "bg-amber-950/30 hover:bg-amber-900/35";

  const openJob = () => {
    window.open(job.url, "_blank");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openJob}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openJob();
        }
      }}
      className={`${columnClass} cursor-pointer border-b border-slate-800/80 text-sm text-slate-200 transition ${rowTone}`}
    >
      <div className="flex items-center justify-center px-4 py-3">
        <ScoreBadge score={job.score} />
      </div>

      <div className="flex min-w-0 items-center gap-2 px-4 py-3">
        {job.email_to_hr ? (
          <Mail className="h-4 w-4 flex-none text-sky-300" aria-label="Email HR" />
        ) : null}
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-50">{job.title}</div>
          <div className="truncate text-xs text-slate-400">{job.company_name}</div>
        </div>
      </div>

      <div className="min-w-0 px-4 py-3">
        <div className="truncate text-slate-200">{job.company_name}</div>
        {job.location ? (
          <div className="truncate text-xs text-slate-500">{job.location}</div>
        ) : null}
      </div>

      <div className="px-4 py-3 text-slate-300">{formatPostedDate(job.posted_date)}</div>

      <div className="min-w-0 px-4 py-3">
        <span className="block truncate text-slate-300">{job.salary || "-"}</span>
      </div>

      <div
        className="px-4 py-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <StatusDropdown value={job.my_status} />
      </div>

      <div
        className="px-4 py-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-sm transition hover:border-sky-500 hover:text-sky-200"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </button>
      </div>
    </div>
  );
}
