import { X, PhoneCall, Plus, Trash2, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  decisionStatuses,
  formatStatusLabel,
  type DecisionJob,
  type DecisionStatus,
} from "../../services/decisionIntelligenceService";
import { supabase } from "../../lib/supabase";

export interface ScreeningRecord {
  id: string;
  date: string;
  company: string;
  role: string;
  recruiterAsked: string;
  recruiterMobile?: string;
  salaryDiscussed: string;
  outcome: 'Waiting' | 'Passed to Interview' | 'Rejected after screening' | 'Ghosted' | 'On Hold';
  nextStepDate: string;
  reasonIfKnown: string;
  createdAt: string;
}

interface DecisionJobModalProps {
  job: DecisionJob;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSaveStatus: (status: DecisionStatus) => void;
  isApplicationView?: boolean;
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
  isApplicationView,
}: DecisionJobModalProps) {
  const isAppliedJob = Boolean(
    isApplicationView ||
    ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'JOINED', 'WITHDRAWN', 'DECLINED'].includes(job.my_status)
  );

  const [selectedStatus, setSelectedStatus] = useState<DecisionStatus>(
    job.my_status,
  );

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string>(() => {
    return (job as any).notes || localStorage.getItem(`job_notes_${job.id}`) || "";
  });
  const [noteSaved, setNoteSaved] = useState(false);

  // Tab State: 'description' vs 'screening'
  const [activeTab, setActiveTab] = useState<'description' | 'screening'>(() => {
    return (job.my_status === 'SCREENING' && isAppliedJob) ? 'screening' : 'description';
  });

  // Screening Tracker State
  const [screeningLogs, setScreeningLogs] = useState<ScreeningRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`job_screening_${job.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recruiterAsked, setRecruiterAsked] = useState('');
  const [recruiterMobile, setRecruiterMobile] = useState('');
  const [salaryDiscussed, setSalaryDiscussed] = useState('');
  const [outcome, setOutcome] = useState<'Waiting' | 'Passed to Interview' | 'Rejected after screening' | 'Ghosted' | 'On Hold'>('Waiting');
  const [nextStepDate, setNextStepDate] = useState('');
  const [reasonIfKnown, setReasonIfKnown] = useState('Unknown');

  // Cloud Sync: Fetch screening logs from Supabase on mount
  useEffect(() => {
    async function loadScreeningFromDb() {
      if (!job.id) return;
      try {
        const { data } = await supabase
          .from("my_jobs")
          .select("screening_logs")
          .eq("job_id", job.id)
          .maybeSingle();

        if (data?.screening_logs && Array.isArray(data.screening_logs) && data.screening_logs.length > 0) {
          setScreeningLogs(data.screening_logs);
          localStorage.setItem(`job_screening_${job.id}`, JSON.stringify(data.screening_logs));
        }
      } catch {
        // Table or column might not be migrated yet; fallback gracefully to localStorage
      }
    }
    loadScreeningFromDb();
  }, [job.id]);

  const saveScreeningLogs = async (logs: ScreeningRecord[]) => {
    setScreeningLogs(logs);
    try {
      localStorage.setItem(`job_screening_${job.id}`, JSON.stringify(logs));
    } catch (e) {
      console.warn("Failed to save screening logs to localStorage:", e);
    }

    // Cloud DB Dual-Sync
    try {
      const payload: Record<string, any> = {
        job_id: job.id,
        status: selectedStatus || job.my_status,
        screening_logs: logs,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("my_jobs")
        .upsert(payload, { onConflict: "job_id" });

      if (error && error.message && error.message.includes("screening_logs")) {
        console.warn("screening_logs column pending DB migration. Local copy preserved.");
      }
    } catch (dbErr) {
      console.warn("Supabase screening_logs sync error:", dbErr);
    }
  };

  const handleAddScreeningRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiterAsked && !salaryDiscussed && !nextStepDate && !recruiterMobile) return;

    const record: ScreeningRecord = {
      id: uuidv4(),
      date: newDate || new Date().toISOString().split('T')[0],
      company: job.company_name || '—',
      role: job.title || '—',
      recruiterAsked: recruiterAsked.trim(),
      recruiterMobile: recruiterMobile.trim(),
      salaryDiscussed: salaryDiscussed.trim(),
      outcome,
      nextStepDate: nextStepDate.trim(),
      reasonIfKnown,
      createdAt: new Date().toISOString(),
    };

    const updated = [record, ...screeningLogs];
    saveScreeningLogs(updated);

    // Auto-align status if applicable
    if (outcome === 'Waiting' && (selectedStatus === 'NEW' || selectedStatus === 'SAVED' || selectedStatus === 'APPLIED')) {
      setSelectedStatus('SCREENING');
    } else if (outcome === 'Passed to Interview') {
      setSelectedStatus('INTERVIEW');
    } else if (outcome === 'Rejected after screening') {
      setSelectedStatus('REJECTED');
    }

    // Reset input fields
    setRecruiterAsked('');
    setRecruiterMobile('');
    setSalaryDiscussed('');
    setNextStepDate('');
    setOutcome('Waiting');
    setReasonIfKnown('Unknown');
  };

  const handleDeleteScreeningRecord = (id: string) => {
    const updated = screeningLogs.filter((r) => r.id !== id);
    saveScreeningLogs(updated);
  };

  const handleSaveNotes = useCallback(async (newNotes?: string) => {
    const textToSave = newNotes !== undefined ? newNotes : notes;
    try {
      localStorage.setItem(`job_notes_${job.id}`, textToSave);
      const payload: Record<string, any> = {
        job_id: job.id,
        status: selectedStatus || job.my_status,
        notes: textToSave,
        screening_logs: screeningLogs,
        updated_at: new Date().toISOString(),
      };
      let { error } = await supabase.from("my_jobs").upsert(payload, { onConflict: "job_id" });
      if (error && error.message && error.message.includes("screening_logs")) {
        delete payload.screening_logs;
        await supabase.from("my_jobs").upsert(payload, { onConflict: "job_id" });
      }
      setNoteSaved(true);
    } catch (err) {
      console.error("Failed to save notes to Supabase:", err);
    }
  }, [job.id, job.my_status, notes, screeningLogs, selectedStatus]);

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
            <div className="decision-modal-ribbon">{formatStatusLabel(job.my_status)}</div>
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
                  onClick={(e) => {
                    const idToCopy = cleanJobId(job.external_id, job.id);
                    navigator.clipboard.writeText(idToCopy);
                    const btn = e.currentTarget;
                    const orig = btn.innerText;
                    btn.innerText = "✓ Copied!";
                    setTimeout(() => { btn.innerText = orig; }, 1200);
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
            {isAppliedJob ? (
              <div className="decision-modal-tabs">
                <button
                  type="button"
                  className={`decision-modal-tab-btn ${activeTab === 'description' ? 'active' : ''}`}
                  onClick={() => setActiveTab('description')}
                >
                  <FileText size={15} /> Job Description
                </button>
                <button
                  type="button"
                  className={`decision-modal-tab-btn ${activeTab === 'screening' ? 'active' : ''}`}
                  onClick={() => setActiveTab('screening')}
                >
                  <PhoneCall size={15} /> Screening Call Tracker
                  {screeningLogs.length > 0 && (
                    <span className="screening-tab-count">{screeningLogs.length}</span>
                  )}
                </button>
              </div>
            ) : (
              <h3>Job Description</h3>
            )}

            {(!isAppliedJob || activeTab === 'description') ? (
              <div className="decision-modal-description-body">
                {job.description || "No job description available."}
              </div>
            ) : (
              <div className="decision-modal-screening-pane">
                {/* Log Call Form */}
                <div className="screening-form-card">
                  <div className="screening-form-header">
                    <h4>📞 Log Screening Call / Check-in</h4>
                    <span className="text-xs text-muted">Track recruiter questions, discussed CTC, and outcome</span>
                  </div>

                  <form onSubmit={handleAddScreeningRecord} className="screening-form-grid">
                    <div className="screening-form-group">
                      <label>Call Date</label>
                      <input 
                        type="date" 
                        className="screening-input" 
                        value={newDate} 
                        onChange={e => setNewDate(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Company</label>
                      <input 
                        type="text" 
                        className="screening-input disabled" 
                        value={job.company_name} 
                        disabled 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Role</label>
                      <input 
                        type="text" 
                        className="screening-input disabled" 
                        value={job.title} 
                        disabled 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Recruiter Mobile No</label>
                      <input 
                        type="tel" 
                        className="screening-input" 
                        placeholder="e.g. +91 98765 43210" 
                        value={recruiterMobile} 
                        onChange={e => setRecruiterMobile(e.target.value)} 
                      />
                    </div>

                    <div className="screening-form-group span-2">
                      <label>Recruiter Asked</label>
                      <input 
                        type="text" 
                        className="screening-input" 
                        placeholder="e.g. Total & relevant exp, current CTC, notice period..." 
                        value={recruiterAsked} 
                        onChange={e => setRecruiterAsked(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Salary Discussed</label>
                      <input 
                        type="text" 
                        className="screening-input" 
                        placeholder="e.g. ₹6L" 
                        value={salaryDiscussed} 
                        onChange={e => setSalaryDiscussed(e.target.value)} 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Outcome</label>
                      <select 
                        className="screening-select" 
                        value={outcome} 
                        onChange={e => setOutcome(e.target.value as any)}
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="Passed to Interview">Passed to Interview</option>
                        <option value="Rejected after screening">Rejected after screening</option>
                        <option value="Ghosted">Ghosted</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>

                    <div className="screening-form-group">
                      <label>Next Step / Date</label>
                      <input 
                        type="text" 
                        className="screening-input" 
                        placeholder="e.g. Follow up Oct 7" 
                        value={nextStepDate} 
                        onChange={e => setNextStepDate(e.target.value)} 
                      />
                    </div>

                    <div className="screening-form-group">
                      <label>Reason if known</label>
                      <select 
                        className="screening-select" 
                        value={reasonIfKnown} 
                        onChange={e => setReasonIfKnown(e.target.value)}
                      >
                        <option value="Unknown">Unknown</option>
                        <option value="Salary">Salary</option>
                        <option value="Experience mismatch">Experience mismatch</option>
                        <option value="Notice period">Notice period</option>
                        <option value="Role put on hold">Role put on hold</option>
                        <option value="Recruiter ghosted">Recruiter ghosted</option>
                        <option value="Rejected after screening">Rejected after screening</option>
                        <option value="JD changed">JD changed</option>
                      </select>
                    </div>

                    <div className="screening-form-group span-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem' }}>
                        <Plus size={16} /> Log Call
                      </button>
                    </div>
                  </form>
                </div>

                {/* Screening Log History Table */}
                <div className="screening-table-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0 }}>Logged Calls ({screeningLogs.length})</h4>
                    {screeningLogs.length > 0 && (
                      <span className="text-xs text-muted">Showing recruiter discussions in chronological order</span>
                    )}
                  </div>

                  {screeningLogs.length === 0 ? (
                    <div className="screening-empty-state">
                      <p className="text-muted" style={{ margin: '0.5rem 0' }}>No screening calls logged for this role yet.</p>
                      <span className="text-xs text-muted">Fill out the quick form above when a recruiter calls to record questions asked, salary, and outcomes.</span>
                    </div>
                  ) : (
                    <div className="screening-table-wrapper">
                      <table className="screening-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Role</th>
                            <th>Mobile No</th>
                            <th>Recruiter Asked</th>
                            <th>Salary Discussed</th>
                            <th>Outcome</th>
                            <th>Next step/date</th>
                            <th>Reason if known</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {screeningLogs.map((log) => (
                            <tr key={log.id}>
                              <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{formatDate(log.date)}</td>
                              <td>{log.company}</td>
                              <td>{log.role}</td>
                              <td>
                                {log.recruiterMobile ? (
                                  <a 
                                    href={`tel:${log.recruiterMobile}`}
                                    style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                    title="Click to call"
                                  >
                                    📞 {log.recruiterMobile}
                                  </a>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td>{log.recruiterAsked || '—'}</td>
                              <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{log.salaryDiscussed || '—'}</td>
                              <td>
                                <span className={`screening-outcome-badge outcome-${log.outcome.toLowerCase().replace(/\s+/g, '-')}`}>
                                  {log.outcome}
                                </span>
                              </td>
                              <td>{log.nextStepDate || '—'}</td>
                              <td>
                                <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                                  {log.reasonIfKnown || 'Unknown'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  type="button" 
                                  className="screening-del-btn" 
                                  title="Delete entry"
                                  onClick={() => handleDeleteScreeningRecord(log.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                {formatStatusLabel(status)}
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
