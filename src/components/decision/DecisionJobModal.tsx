import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decisionStatuses,
  type DecisionJob,
  type DecisionStatus,
} from "../../services/decisionIntelligenceService";
import { supabase } from "../../lib/supabase";

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
  if (value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) {
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

function cleanJobId(externalId?: string | null, id?: string) {
  const raw = externalId || id || "";
  return raw.replace(/^[a-zA-Z0-9]+_/, "") || raw;
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

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string>(() => {
    return (job as any).notes || localStorage.getItem(`job_notes_${job.id}`) || "";
  });
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNotes = useCallback(async (newNotes?: string) => {
    const textToSave = newNotes !== undefined ? newNotes : notes;
    try {
      localStorage.setItem(`job_notes_${job.id}`, textToSave);
      await supabase.from("my_jobs").upsert(
        {
          job_id: job.id,
          status: selectedStatus || job.my_status,
          notes: textToSave,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id" }
      );
      setNoteSaved(true);
    } catch (err) {
      console.error("Failed to save notes to Supabase:", err);
    }
  }, [job.id, job.my_status, notes, selectedStatus]);

  const handleSaveAll = useCallback(async () => {
    await handleSaveNotes();
    onSaveStatus(selectedStatus);
  }, [handleSaveNotes, onSaveStatus, selectedStatus]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleSaveAll();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSaveAll]);

  const resumeName = useMemo(() => {
    if (job.resume && job.resume.recommended && job.resume.recommended.name) {
      return job.resume.recommended.name.replace(/_/g, " ");
    }
    return null;
  }, [job.resume]);

  const handleDownload = async (storagePath: string, displayName?: string) => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    let bucket = "resume-library";
    let filePath = storagePath;
    
    const parts = storagePath.split('/');
    if (parts.length > 1 && parts[0] === "resume-library") {
      bucket = parts[0];
      filePath = parts.slice(1).join('/');
    }

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);

      if (signedUrlError || !data?.signedUrl) {
        setDownloadError(signedUrlError?.message ?? "Unable to create download link.");
        return;
      }

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = displayName ? `${displayName}.docx` : (filePath.split('/').pop() || "resume.docx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setDownloadError(err.message ?? "An unexpected error occurred during download.");
    } finally {
      setDownloading(false);
    }
  };

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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
              <p style={{ margin: 0 }}>{job.company_name}</p>
              {cleanJobId(job.external_id, job.id) && (
                <button
                  type="button"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "4px",
                    color: "var(--accent-primary, #38bdf8)",
                    fontSize: "0.75rem",
                    padding: "0.15rem 0.45rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontFamily: "monospace"
                  }}
                  title="Click to copy Job ID"
                  onClick={() => {
                    navigator.clipboard.writeText(cleanJobId(job.external_id, job.id));
                    alert(`Copied Job ID: ${cleanJobId(job.external_id, job.id)}`);
                  }}
                >
                  📋 #{cleanJobId(job.external_id, job.id)}
                </button>
              )}
            </div>
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

            <section className="decision-modal-notes">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0 }}>My Job Notes 📝</h3>
                {noteSaved && (
                  <span style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: 800 }}>
                    Saved ✓
                  </span>
                )}
              </div>
              <textarea
                className="decision-modal-notes-textarea"
                placeholder="Type private notes for this job (e.g. recruiter contact info, interview prep notes, follow-up date)..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNoteSaved(false);
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSaveAll();
                  }
                }}
                onBlur={() => handleSaveNotes()}
              />
            </section>
          </aside>
        </main>

        <footer className="decision-modal-actions">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
            <div className="decision-modal-resume">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span>Recommended Resume :</span>
                {resumeName ? (
                  <strong>{resumeName}</strong>
                ) : (
                  <span style={{ textTransform: "none", letterSpacing: "normal", fontSize: "0.88rem", fontWeight: "normal" }}>
                    No resume recommendation
                  </span>
                )}
              </div>
              {resumeName && (
                <button
                  type="button"
                  className="decision-modal-download-btn"
                  title="Download Resume"
                  onClick={() => {
                    const storagePath = job.resume?.recommended?.storage_path || job.resume?.recommended?.storagePath || job.resume?.recommended?.path || `${job.resume?.recommended?.name}.docx`;
                    handleDownload(storagePath, resumeName);
                  }}
                  disabled={downloading}
                >
                  {downloading ? "⏳" : "⏬"}
                </button>
              )}
            </div>
            {downloadError && (
              <p style={{ margin: 0, paddingLeft: "0.25rem", color: "#f87171", fontSize: "0.75rem" }}>
                {downloadError}
              </p>
            )}
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
            onClick={handleSaveAll}
            disabled={saving}
            title="Save changes (Ctrl + Enter)"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button 
            type="button" 
            className="decision-modal-apply"
            onClick={() => {
              if (job.url) {
                window.open(job.url, "_blank", "noopener,noreferrer");
              }
            }}
          >
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
