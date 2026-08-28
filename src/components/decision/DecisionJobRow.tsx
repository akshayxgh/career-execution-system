import { ExternalLink, Mail } from "lucide-react";
import type {
  DecisionJob,
  DecisionStatus,
} from "../../services/decisionIntelligenceService";
import ScoreBadge from "./ScoreBadge";
import StatusDropdown from "./StatusDropdown";
import { formatToISTShortDate, formatToISTDateTime } from "../../utils/dateUtils";

interface DecisionJobRowProps {
  job: DecisionJob;
  onOpenJob: (job: DecisionJob) => void;
  onStatusChange: (jobId: string, status: DecisionStatus) => void;
  isRemoving?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
}

function formatPostedDate(postedDate: string | null) {
  if (!postedDate) return "—";
  return formatToISTShortDate(postedDate);
}

function formatAnalyzedDate(analyzedAt: string) {
  if (!analyzedAt) return "—";
  return formatToISTDateTime(analyzedAt);
}

function formatScraperName(scraper: string | null | undefined, source: string) {
  const val = scraper || source || "—";
  if (val.toLowerCase().includes("recommended")) return "Recommended";
  if (val.toLowerCase().includes("portal")) return "Portals";
  if (val.toLowerCase().includes("career")) return "Career";
  if (val.toLowerCase().includes("link")) return "Links";
  return val;
}

function cleanJobId(externalId?: string | null, id?: string) {
  const raw = externalId || id || "";
  // Strip common scraper prefixes like 'kpmg_', 'naukri_', 'tcs_', 'ey_'
  return raw.replace(/^[a-zA-Z0-9]+_/, "") || raw;
}



function formatSalary(salary: string | null) {
  if (!salary) {
    return "—";
  }

  const matches = salary.match(/\d+/g);

  if (!matches || matches.length === 0) {
    return salary;
  }

  const formatAmount = (value: string) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return value;
    }

    const lakhs = amount / 100000;
    const formatted = Number.isInteger(lakhs)
      ? lakhs.toString()
      : lakhs.toFixed(2).replace(/\.?0+$/, "");

    return `₹${formatted}L`;
  };

  if (matches.length === 1) {
    return formatAmount(matches[0]);
  }

  return `${formatAmount(matches[0])} – ${formatAmount(matches[1])}`;
}

export default function DecisionJobRow({
  job,
  onOpenJob,
  onStatusChange,
  isRemoving = false,
  isSelected = false,
  onToggleSelect,
}: DecisionJobRowProps) {
  const rowTone =
    job.recommendation === "Apply"
      ? "decision-row-apply"
      : "decision-row-maybe";

  const handleRowClick = () => {
    if (job.url) {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
  };


  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleRowClick();
        }
      }}
      className={`decision-row ${rowTone} ${isSelected ? "decision-row-selected" : ""} ${isRemoving ? "decision-row-removing" : ""}`}
    >
      <div className="decision-cell decision-score-cell">
        <ScoreBadge
          score={job.score}
          isSelected={isSelected}
          onToggleSelect={
            onToggleSelect
              ? (e) => {
                  e.stopPropagation();
                  onToggleSelect(job.id);
                }
              : undefined
          }
        />
      </div>

      <div className="decision-cell decision-title-cell">
        {job.email_to_hr ? (
          <Mail className="decision-mail-icon" aria-label="Email HR" />
        ) : null}
        <div className="decision-title-wrap">
          <div className="decision-job-title">{job.title}</div>
          <div className="decision-job-company-sub" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span>{job.company_name}</span>
            {cleanJobId(job.external_id, job.id) && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.12rem 0.45rem",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "4px",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  userSelect: "none"
                }}
                title="Click to copy Job ID"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = cleanJobId(job.external_id, job.id);
                  navigator.clipboard.writeText(targetId);
                  const el = e.currentTarget;
                  const orig = el.innerText;
                  el.innerText = "✓ Copied";
                  setTimeout(() => { el.innerText = orig; }, 1000);
                }}
              >
                #{cleanJobId(job.external_id, job.id)}
              </span>
            )}

          </div>
        </div>

      </div>

      <div className="decision-cell decision-muted-cell">{formatPostedDate(job.posted_date)}</div>

      <div className="decision-cell decision-muted-cell">{formatAnalyzedDate(job.analyzed_at)}</div>

      <div className="decision-cell decision-scraper-cell">
        <span className="badge badge-secondary" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0.2rem 0.5rem' }}>
          {formatScraperName(job.scraper, job.source)}
        </span>
      </div>

      <div className="decision-cell decision-experience-cell">


        <span>{job.experience || "—"}</span>
      </div>

      <div className="decision-cell decision-salary-cell">
        <span>{formatSalary(job.salary)}</span>
      </div>

      <div
        className="decision-cell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <StatusDropdown
          value={job.my_status}
          options={["SAVED", "APPLIED", "HIDDEN"]}
          onChange={(status) => onStatusChange(job.id, status)}
        />
      </div>

      <div
        className="decision-cell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="decision-view-button"
          onClick={() => onOpenJob(job)}
        >
          <ExternalLink className="decision-view-icon" />
          Details
        </button>
      </div>
    </div>
  );
}
