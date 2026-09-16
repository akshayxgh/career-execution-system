import { useState, useEffect, useRef } from "react";
import { Zap, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink, Loader2, StopCircle } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface ShineApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DecisionJob[];
  onJobApplied: (jobId: string) => Promise<void>;
  onAllCompleted: () => void;
}

interface AppliedJob {
  jobId: string;
  title: string;
  company: string;
  url: string;
  status: string;
  message?: string;
}

export default function ShineApplyModal({
  isOpen,
  onClose,
  jobs,
  onJobApplied,
  onAllCompleted,
}: ShineApplyModalProps) {
  const [extensionStatus, setExtensionStatus] = useState<"checking" | "detected" | "missing">("checking");
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentJob, setCurrentJob] = useState<{ title: string; company: string; url: string } | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<AppliedJob[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter all Shine jobs from the decision list
  const shineJobs = jobs.filter((j) => {
    const url = (j.url || "").toLowerCase();
    const source = (j.source || "").toLowerCase();
    return url.includes("shine.com") || source.includes("shine");
  });

  const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pingExtension = () => {
    setExtensionStatus("checking");
    window.postMessage({ source: "myces-web", type: "MYCES_PING" }, "*");

    if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    pingTimeoutRef.current = setTimeout(() => {
      setExtensionStatus((prev) => (prev === "checking" ? "missing" : prev));
    }, 800);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsApplying(false);
      setIsFinished(false);
      setProgress({ current: 0, total: 0 });
      setCurrentJob(null);
      return;
    }

    pingExtension();

    const handleWindowMessage = async (event: MessageEvent) => {
      if (!event.data || event.data.source !== "myces-companion") return;

      const { type, action } = event.data;
      const msgType = type || action;

      if (msgType === "MYCES_PONG") {
        if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        setExtensionStatus("detected");
      }

      if (msgType === "MYCES_SHINE_STARTED") {
        setIsApplying(true);
        setIsFinished(false);
      }

      if (msgType === "MYCES_JOB_PROGRESS") {
        const { jobId, title, company, url, status, message, current, total } = event.data;
        setProgress({ current, total });
        setCurrentJob({ title, company, url });

        if (status === "APPLIED") {
          setAppliedJobs((prev) => [
            { jobId, title, company, url, status, message },
            ...prev,
          ]);
          try {
            await onJobApplied(jobId);
          } catch (e) {
            console.error("Failed to update applied job status in Supabase:", e);
          }
        } else {
          setSavedJobs((prev) => [
            { jobId, title, company, url, status: status || "SAVED", message },
            ...prev,
          ]);
        }
      }

      if (msgType === "MYCES_SHINE_BATCH_COMPLETED") {
        setIsApplying(false);
        setIsFinished(true);
        setCurrentJob(null);
        onAllCompleted();
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    };
  }, [isOpen]);

  const handleStartApply = () => {
    if (shineJobs.length === 0) {
      setErrorMessage("No active Shine jobs found in current filtered view.");
      return;
    }

    setErrorMessage(null);
    setAppliedJobs([]);
    setSavedJobs([]);
    setIsFinished(false);
    setProgress({ current: 0, total: shineJobs.length });
    setIsApplying(true);

    const formattedJobs = shineJobs.map((j) => ({
      id: j.id,
      title: j.title,
      company_name: j.company_name,
      url: j.url,
    }));

    window.postMessage(
      {
        source: "myces-web",
        type: "MYCES_START_SHINE_APPLY",
        jobs: formattedJobs,
      },
      "*"
    );
  };

  const handleCancelApply = () => {
    window.postMessage(
      {
        source: "myces-web",
        type: "MYCES_CANCEL_SHINE_APPLY",
      },
      "*"
    );
    setIsApplying(false);
  };

  if (!isOpen) return null;

  const percentage =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="naukri-modal-overlay" onClick={onClose}>
      <div
        className="naukri-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="naukri-modal-header" style={{ borderBottomColor: "#bbf7d0" }}>
          <div className="naukri-modal-title">
            <Zap size={20} style={{ color: "#16a34a" }} />
            <h3 style={{ color: "#166534" }}>Auto-Apply Shine Jobs</h3>
          </div>
          <button className="naukri-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="naukri-modal-body">
          {/* Extension Missing Helper */}
          {extensionStatus === "missing" && (
            <div className="naukri-setup-box">
              <div className="naukri-setup-header">
                <AlertCircle size={22} className="naukri-warning-icon" />
                <div>
                  <h4>Browser Companion Extension Required</h4>
                  <p>
                    To auto-apply directly on Shine using your authenticated session, load the Job Autofill extension into your browser:
                  </p>
                </div>
              </div>

              <div className="naukri-setup-steps">
                <div className="naukri-step">
                  <span className="naukri-step-num">1</span>
                  <span>
                    Go to <code>chrome://extensions</code>
                  </span>
                </div>
                <div className="naukri-step">
                  <span className="naukri-step-num">2</span>
                  <span>Enable <strong>"Developer mode"</strong>.</span>
                </div>
                <div className="naukri-step">
                  <span className="naukri-step-num">3</span>
                  <span>
                    Click <strong>"Load unpacked"</strong> and select:
                    <br />
                    <code className="naukri-path-code">
                      form_filler_chrome_extension\job-autofill
                    </code>
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="naukri-recheck-btn"
                onClick={pingExtension}
              >
                <RefreshCw size={15} /> Re-check Extension
              </button>
            </div>
          )}

          {/* Extension Detected & Ready */}
          {extensionStatus === "detected" && (
            <>
              {!isApplying && !isFinished && (
                <div className="naukri-ready-state">
                  <p className="naukri-ready-desc">
                    Found <strong>{shineJobs.length} Shine jobs</strong> in your current Decision Intelligence view.
                    The companion will open each posting sequentially in the background, click 1-click apply, answer screening questions automatically, and mark them as <strong>APPLIED</strong> in Supabase.
                  </p>

                  <div className="naukri-summary-pills">
                    <span className="naukri-pill total" style={{ backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>
                      Total Shine Jobs: <strong>{shineJobs.length}</strong>
                    </span>
                  </div>

                  {errorMessage && (
                    <div className="naukri-error-banner">{errorMessage}</div>
                  )}

                  <div className="naukri-actions-row">
                    <button
                      type="button"
                      className="naukri-start-btn"
                      style={{ backgroundColor: "#16a34a", borderColor: "#15803d" }}
                      onClick={handleStartApply}
                      disabled={shineJobs.length === 0}
                    >
                      <Zap size={16} /> Start Auto-Apply ({shineJobs.length} Jobs)
                    </button>
                  </div>
                </div>
              )}

              {/* In Progress */}
              {isApplying && (
                <div className="naukri-progress-state">
                  <div className="naukri-progress-top">
                    <span className="naukri-progress-label">
                      Auto-Applying Jobs ({progress.current} of {progress.total})
                    </span>
                    <span className="naukri-progress-percent">{percentage}%</span>
                  </div>

                  <div className="naukri-progress-bar-track">
                    <div
                      className="naukri-progress-bar-fill"
                      style={{ width: `${percentage}%`, backgroundColor: "#16a34a" }}
                    />
                  </div>

                  {currentJob && (
                    <div className="naukri-current-job-card">
                      <Loader2 size={16} className="naukri-spinner" style={{ color: "#16a34a" }} />
                      <div className="naukri-current-job-details">
                        <div className="naukri-current-job-title">
                          {currentJob.title}
                        </div>
                        <div className="naukri-current-job-sub">
                          {currentJob.company} •{" "}
                          <a
                            href={currentJob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="naukri-current-link"
                          >
                            Open Posting <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="naukri-stats-grid">
                    <div className="naukri-stat-card applied">
                      <span className="naukri-stat-val">{appliedJobs.length}</span>
                      <span className="naukri-stat-name">Applied Successfully</span>
                    </div>
                    <div className="naukri-stat-card untouched" style={{ borderLeftColor: "#f59e0b" }}>
                      <span className="naukri-stat-val" style={{ color: "#d97706" }}>{savedJobs.length}</span>
                      <span className="naukri-stat-name">Saved (Needs Review)</span>
                    </div>
                  </div>

                  <div className="naukri-actions-row">
                    <button
                      type="button"
                      className="naukri-cancel-btn"
                      onClick={handleCancelApply}
                    >
                      <StopCircle size={16} /> Stop Auto-Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Finished State */}
              {isFinished && (
                <div className="naukri-finished-state">
                  <div className="naukri-finished-badge">
                    <CheckCircle2 size={32} style={{ color: "#10b981" }} />
                    <h4>Auto-Apply Completed!</h4>
                  </div>
                  <p>
                    Finished processing Shine jobs. 
                    <strong> {appliedJobs.length} applications submitted</strong> and{" "}
                    <strong>{savedJobs.length} saved for review</strong>.
                  </p>

                  <div className="naukri-stats-grid">
                    <div className="naukri-stat-card applied">
                      <span className="naukri-stat-val">{appliedJobs.length}</span>
                      <span className="naukri-stat-name">Marked Applied</span>
                    </div>
                    <div className="naukri-stat-card untouched">
                      <span className="naukri-stat-val">{savedJobs.length}</span>
                      <span className="naukri-stat-name">Saved for Review</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="naukri-done-btn"
                    style={{ backgroundColor: "#16a34a" }}
                    onClick={onClose}
                  >
                    Done & Refresh
                  </button>
                </div>
              )}

              {/* Processed Jobs List */}
              {(appliedJobs.length > 0 || savedJobs.length > 0) && (
                <div className="naukri-detected-list-section">
                  <h5>Processed Jobs:</h5>
                  <div className="naukri-detected-list">
                    {appliedJobs.map((item, idx) => (
                      <div key={`app-${idx}`} className="naukri-detected-item applied">
                        <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                        <span className="naukri-item-title">{item.title}</span>
                        <span className="naukri-item-company">@{item.company}</span>
                        <span className="naukri-item-badge applied">APPLIED</span>
                      </div>
                    ))}
                    {savedJobs.map((item, idx) => (
                      <div key={`saved-${idx}`} className="naukri-detected-item" style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
                        <AlertCircle size={14} style={{ color: "#f59e0b" }} />
                        <span className="naukri-item-title">{item.title}</span>
                        <span className="naukri-item-company">@{item.company}</span>
                        <span className="naukri-item-badge" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
                          {item.message || "SAVED"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
