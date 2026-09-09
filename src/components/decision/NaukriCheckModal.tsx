import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink, Loader2, StopCircle } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface NaukriCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DecisionJob[];
  onJobApplied: (jobId: string) => Promise<void>;
  onJobExpired?: (jobId: string) => Promise<void>;
  onAllCompleted: () => void;
}

interface DetectedJob {
  jobId: string;
  title: string;
  company: string;
  url: string;
  status: string;
}

export default function NaukriCheckModal({
  isOpen,
  onClose,
  jobs,
  onJobApplied,
  onJobExpired,
  onAllCompleted,
}: NaukriCheckModalProps) {
  const [extensionStatus, setExtensionStatus] = useState<"checking" | "detected" | "missing">("checking");
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentJob, setCurrentJob] = useState<{ title: string; company: string; url: string } | null>(null);
  const [detectedApplied, setDetectedApplied] = useState<DetectedJob[]>([]);
  const [detectedExpired, setDetectedExpired] = useState<DetectedJob[]>([]);
  const [untouchedCount, setUntouchedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const naukriJobs = jobs.filter((j) => (j.url || "").toLowerCase().includes("naukri.com"));
  const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ping the extension on modal open
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
      setIsChecking(false);
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

      if (msgType === "MYCES_CHECK_STARTED") {
        setIsChecking(true);
        setIsFinished(false);
      }

      if (msgType === "MYCES_JOB_PROGRESS") {
        const { jobId, title, company, url, status, current, total } = event.data;
        setProgress({ current, total });
        setCurrentJob({ title, company, url });

        if (status === "APPLIED") {
          setDetectedApplied((prev) => [
            { jobId, title, company, url, status },
            ...prev,
          ]);
          try {
            await onJobApplied(jobId);
          } catch (e) {
            console.error("Failed to update applied job status in Supabase:", e);
          }
        } else if (status === "EXPIRED") {
          setDetectedExpired((prev) => [
            { jobId, title, company, url, status },
            ...prev,
          ]);
          if (onJobExpired) {
            try {
              await onJobExpired(jobId);
            } catch (e) {
              console.error("Failed to update expired job status in Supabase:", e);
            }
          }
        } else {
          setUntouchedCount((prev) => prev + 1);
        }
      }

      if (msgType === "MYCES_CHECK_COMPLETED") {
        setIsChecking(false);
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

  const handleStartCheck = () => {
    if (naukriJobs.length === 0) {
      setErrorMessage("No active Naukri jobs found in current view.");
      return;
    }

    setErrorMessage(null);
    setDetectedApplied([]);
    setDetectedExpired([]);
    setUntouchedCount(0);
    setIsFinished(false);
    setProgress({ current: 0, total: naukriJobs.length });
    setIsChecking(true);

    const formattedJobs = naukriJobs.map((j) => ({
      id: j.id,
      title: j.title,
      company_name: j.company_name,
      url: j.url,
    }));

    window.postMessage(
      {
        source: "myces-web",
        type: "MYCES_START_NAUKRI_CHECK",
        jobs: formattedJobs,
      },
      "*"
    );
  };

  const handleCancelCheck = () => {
    window.postMessage(
      {
        source: "myces-web",
        type: "MYCES_CANCEL_NAUKRI_CHECK",
      },
      "*"
    );
    setIsChecking(false);
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
        <div className="naukri-modal-header">
          <div className="naukri-modal-title">
            <Sparkles size={20} className="naukri-modal-icon" />
            <h3>Check Naukri Applied & Expired Jobs</h3>
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
                    To check applied and expired status directly on Naukri using your authenticated session, load the companion extension once into your browser:
                  </p>
                </div>
              </div>

              <div className="naukri-setup-steps">
                <div className="naukri-step">
                  <span className="naukri-step-num">1</span>
                  <span>
                    Open a new tab and go to <code>chrome://extensions</code> (or <code>brave://extensions</code>)
                  </span>
                </div>
                <div className="naukri-step">
                  <span className="naukri-step-num">2</span>
                  <span>Enable <strong>"Developer mode"</strong> in the top-right toggle.</span>
                </div>
                <div className="naukri-step">
                  <span className="naukri-step-num">3</span>
                  <span>
                    Click <strong>"Load unpacked"</strong> and select folder:
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
              {!isChecking && !isFinished && (
                <div className="naukri-ready-state">
                  <p className="naukri-ready-desc">
                    Found <strong>{naukriJobs.length} active Naukri jobs</strong> in your Decision Intelligence view.
                    The companion extension will inspect each in the background using your active Naukri session, marking already applied jobs as <strong>APPLIED</strong> and expired jobs as <strong>HIDDEN</strong> in Supabase.
                  </p>

                  <div className="naukri-summary-pills">
                    <span className="naukri-pill total">
                      Total Naukri Jobs: <strong>{naukriJobs.length}</strong>
                    </span>
                  </div>

                  {errorMessage && (
                    <div className="naukri-error-banner">{errorMessage}</div>
                  )}

                  <div className="naukri-actions-row">
                    <button
                      type="button"
                      className="naukri-start-btn"
                      onClick={handleStartCheck}
                      disabled={naukriJobs.length === 0}
                    >
                      <Sparkles size={16} /> Start Checking Now
                    </button>
                  </div>
                </div>
              )}

              {/* In Progress */}
              {isChecking && (
                <div className="naukri-progress-state">
                  <div className="naukri-progress-top">
                    <span className="naukri-progress-label">
                      Checking Jobs ({progress.current} of {progress.total})
                    </span>
                    <span className="naukri-progress-percent">{percentage}%</span>
                  </div>

                  <div className="naukri-progress-bar-track">
                    <div
                      className="naukri-progress-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {currentJob && (
                    <div className="naukri-current-job-card">
                      <Loader2 size={16} className="naukri-spinner" />
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
                            Open Link <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="naukri-stats-grid">
                    <div className="naukri-stat-card applied">
                      <span className="naukri-stat-val">{detectedApplied.length}</span>
                      <span className="naukri-stat-name">Marked Applied</span>
                    </div>
                    <div className="naukri-stat-card expired">
                      <span className="naukri-stat-val">{detectedExpired.length}</span>
                      <span className="naukri-stat-name">Hidden (Expired)</span>
                    </div>
                    <div className="naukri-stat-card untouched">
                      <span className="naukri-stat-val">{untouchedCount}</span>
                      <span className="naukri-stat-name">Untouched / Active</span>
                    </div>
                  </div>

                  <div className="naukri-actions-row">
                    <button
                      type="button"
                      className="naukri-cancel-btn"
                      onClick={handleCancelCheck}
                    >
                      <StopCircle size={16} /> Stop Check
                    </button>
                  </div>
                </div>
              )}

              {/* Finished State */}
              {isFinished && (
                <div className="naukri-finished-state">
                  <div className="naukri-finished-badge">
                    <CheckCircle2 size={32} style={{ color: "#10b981" }} />
                    <h4>Check Completed!</h4>
                  </div>
                  <p>
                    Inspection finished. Found{" "}
                    <strong>{detectedApplied.length} applied</strong> and{" "}
                    <strong>{detectedExpired.length} expired</strong> jobs.
                    They have been updated in Supabase and automatically removed from Decision Intelligence.
                  </p>

                  <div className="naukri-stats-grid">
                    <div className="naukri-stat-card applied">
                      <span className="naukri-stat-val">{detectedApplied.length}</span>
                      <span className="naukri-stat-name">Marked Applied</span>
                    </div>
                    <div className="naukri-stat-card expired">
                      <span className="naukri-stat-val">{detectedExpired.length}</span>
                      <span className="naukri-stat-name">Hidden (Expired)</span>
                    </div>
                    <div className="naukri-stat-card untouched">
                      <span className="naukri-stat-val">{untouchedCount}</span>
                      <span className="naukri-stat-name">Kept in Decision Intelligence</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="naukri-done-btn"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Detected List if any applied or expired */}
              {(detectedApplied.length > 0 || detectedExpired.length > 0) && (
                <div className="naukri-detected-list-section">
                  <h5>Processed Jobs:</h5>
                  <div className="naukri-detected-list">
                    {detectedApplied.map((item, idx) => (
                      <div key={`app-${idx}`} className="naukri-detected-item applied">
                        <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                        <span className="naukri-item-title">{item.title}</span>
                        <span className="naukri-item-company">@{item.company}</span>
                        <span className="naukri-item-badge applied">APPLIED</span>
                      </div>
                    ))}
                    {detectedExpired.map((item, idx) => (
                      <div key={`exp-${idx}`} className="naukri-detected-item expired">
                        <AlertCircle size={14} style={{ color: "#f43f5e" }} />
                        <span className="naukri-item-title">{item.title}</span>
                        <span className="naukri-item-company">@{item.company}</span>
                        <span className="naukri-item-badge expired">EXPIRED</span>
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
