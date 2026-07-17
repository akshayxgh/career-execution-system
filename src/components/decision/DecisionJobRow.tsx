import { ExternalLink, Mail } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";
import ScoreBadge from "./ScoreBadge";
import StatusDropdown from "./StatusDropdown";

interface DecisionJobRowProps {
  job: DecisionJob;
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

export default function DecisionJobRow({ job }: DecisionJobRowProps) {
  const rowTone =
    job.recommendation === "Apply"
      ? "decision-row-apply"
      : "decision-row-maybe";

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
      className={`decision-row ${rowTone}`}
    >
      <div className="decision-cell decision-score-cell">
        <ScoreBadge score={job.score} />
      </div>

      <div className="decision-cell decision-title-cell">
        {job.email_to_hr ? (
          <Mail className="decision-mail-icon" aria-label="Email HR" />
        ) : null}
        <div className="decision-title-wrap">
          <div className="decision-job-title">{job.title}</div>
          <div className="decision-job-company-sub">{job.company_name}</div>
        </div>
      </div>

      <div className="decision-cell decision-company-cell">
        <div className="decision-company-name">{job.company_name}</div>
        {job.location ? (
          <div className="decision-location">{job.location}</div>
        ) : null}
      </div>

      <div className="decision-cell decision-muted-cell">{formatPostedDate(job.posted_date)}</div>

      <div className="decision-cell decision-salary-cell">
        <span>{job.salary || "-"}</span>
      </div>

      <div
        className="decision-cell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <StatusDropdown value={job.my_status} />
      </div>

      <div
        className="decision-cell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="decision-view-button"
        >
          <ExternalLink className="decision-view-icon" />
          View
        </button>
      </div>
    </div>
  );
}
