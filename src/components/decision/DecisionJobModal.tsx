import { X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  decisionStatuses,
  type DecisionJob,
  type DecisionStatus,
} from "../../services/decisionIntelligenceService";

interface DecisionJobModalProps {
  job: DecisionJob;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSaveStatus: (status: DecisionStatus) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = formatDate(value);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${day} ${time}`;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getScoreClass(score: number) {
  if (score >= 90) return "score-green";
  if (score >= 75) return "score-blue";
  if (score >= 60) return "score-yellow";
  return "score-red";
}

export default function DecisionJobModal({
  job,
  saving,
  saveError,
  onClose,
  onSaveStatus,
}: DecisionJobModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<DecisionStatus>(
    job.my_status,
  );

  const recommendedResume = useMemo(
    () => job.recommended_master_resume ?? job.recommended_resume ?? "-",
    [job.recommended_master_resume, job.recommended_resume],
  );

  return (
    <div
      className="decision-modal-backdrop"
      role="presentation"
    >
      <article
        className="decision-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-modal-title"
      >
        <button
          type="button"
          className="decision-modal-close"
          onClick={onClose}
          aria-label="Close job details"
        >
          <X />
        </button>

        <header className="decision-modal-header">
          <div className={`decision-modal-score-card ${getScoreClass(job.score)}`}>
            <span>Score</span>
            <strong>{job.score}</strong>
          </div>

          <div className="decision-modal-title-card">
            <div className="decision-modal-ribbon">{job.my_status}</div>
            <h2 id="decision-modal-title">{job.title}</h2>
            <p>{job.company_name}</p>
          </div>

          <dl className="decision-modal-meta">
            <div>
              <dt>Created Date:</dt>
              <dd>{formatDate(job.created_at ?? job.posted_date)}</dd>
            </div>
            <div>
              <dt>Analysed on:</dt>
              <dd>{formatDateTime(job.analyzed_at)}</dd>
            </div>
            <div>
              <dt>HR Email:</dt>
              <dd>{formatValue(job.hr_email)}</dd>
            </div>
          </dl>
        </header>

        <div className="decision-modal-divider" />

        <main className="decision-modal-main">
          <section className="decision-modal-description">
            <h3>Job Description</h3>
            <div className="decision-modal-description-body">
              {job.description || "No job description available."}
            </div>
          </section>

          <aside className="decision-modal-side">
            <section className="decision-modal-side-card">
              <dl>
                <div>
                  <dt>Confidence</dt>
                  <dd>{formatValue(job.confidence)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{formatValue(job.source)}</dd>
                </div>
                <div>
                  <dt>Salary</dt>
                  <dd>{formatValue(job.salary)}</dd>
                </div>
                <div>
                  <dt>Search Keyword</dt>
                  <dd>{formatValue(job.search_keyword || (job as any).keyword)}</dd>
                </div>
                <div>
                  <dt>Search Location</dt>
                  <dd>{formatValue(job.search_location ?? job.location)}</dd>
                </div>
              </dl>
            </section>

            <section className="decision-modal-reason">
              <h3>Reason</h3>
              <p>{job.reason || "-"}</p>
            </section>
          </aside>
        </main>

        <footer className="decision-modal-actions">
          <div className="decision-modal-resume">
            <span>Recommended Resume</span>
            <strong>{recommendedResume}</strong>
          </div>

          <button type="button" className="decision-modal-generate">
            Generate Resume
          </button>

          <select
            className="decision-modal-status"
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as DecisionStatus)
            }
          >
            {decisionStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="decision-modal-save"
            onClick={() => onSaveStatus(selectedStatus)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button type="button" className="decision-modal-apply">
            Apply
          </button>

          {saveError ? (
            <p className="decision-modal-save-error">{saveError}</p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
