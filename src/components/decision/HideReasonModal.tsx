import { useState, useEffect, useCallback } from "react";
import { EyeOff, X } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface HideReasonModalProps {
  job?: DecisionJob | null;
  jobsToHide?: DecisionJob[];
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const COMMON_REASONS = [
  { id: "location", label: "Location / Remote Mismatch", icon: "📍" },
  { id: "salary", label: "Salary / Compensation Too Low", icon: "💰" },
  { id: "skills", label: "Irrelevant Skills / Tech Stack", icon: "🛠️" },
  { id: "experience", label: "Experience Level Mismatch", icon: "📈" },
  { id: "consultancy", label: "Third-Party / Consultancy", icon: "🏢" },
  { id: "expired", label: "Job Expired or Inactive", icon: "⏳" },
  { id: "duplicate", label: "Duplicate Job Posting", icon: "📑" },
  { id: "other", label: "Other Reason", icon: "✍️" },
];

export default function HideReasonModal({
  job,
  jobsToHide = [],
  onConfirm,
  onCancel,
  loading = false,
}: HideReasonModalProps) {
  const [customReason, setCustomReason] = useState<string>("");

  const activeJob = job || (jobsToHide.length === 1 ? jobsToHide[0] : null);
  const isBulk = jobsToHide.length > 1;
  const isVisible = Boolean(activeJob || isBulk);

  useEffect(() => {
    setCustomReason("");
  }, [job, jobsToHide]);

  const handleConfirmCustom = useCallback(() => {
    if (!isVisible || loading) return;
    const fullReason = customReason.trim() || "User marked as hidden";
    onConfirm(fullReason);
  }, [isVisible, loading, customReason, onConfirm]);

  const handlePresetClick = (presetLabel: string) => {
    if (!isVisible || loading) return;
    const fullReason = customReason.trim()
      ? `${presetLabel} - ${customReason.trim()}`
      : presetLabel;
    onConfirm(fullReason);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleConfirmCustom();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, handleConfirmCustom]);

  if (!isVisible) return null;


  return (
    <div
      className="decision-modal-backdrop"
      onClick={onCancel}
      style={{ zIndex: 1100 }}
    >
      <div
        className="hide-reason-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="hide-reason-header">
          <div className="hide-reason-title-wrap">
            <div className="hide-reason-icon-badge">
              <EyeOff size={18} />
            </div>
            <div>
              <h2 className="hide-reason-title">
                {isBulk ? `Reason to Hide ${jobsToHide.length} Jobs` : "Reason to Hide Job"}
              </h2>
              <p className="hide-reason-subtitle">
                {isBulk ? (
                  <span>
                    Selected {jobsToHide.length} jobs will be marked as hidden
                  </span>
                ) : activeJob ? (
                  <span>
                    {activeJob.title} • <span className="hide-reason-company">{activeJob.company_name}</span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="hide-reason-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="hide-reason-body">
          <label className="hide-reason-label">
            Click an option to hide instantly:
          </label>
          <div className="hide-reason-presets-grid">
            {COMMON_REASONS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="hide-reason-preset-btn"
                onClick={() => handlePresetClick(preset.label)}
                disabled={loading}
                title={`Hide with reason: ${preset.label}`}
              >
                <span className="hide-reason-preset-icon">{preset.icon}</span>
                <span className="hide-reason-preset-text">{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="hide-reason-custom-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="hide-reason-label">
                Or type custom feedback:
              </label>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Ctrl + Enter to confirm
              </span>
            </div>
            <textarea
              className="hide-reason-textarea"
              placeholder="Type custom reason if not listed above..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmCustom();
                }
              }}
              rows={2}
            />
          </div>
        </div>

        <footer className="hide-reason-footer">
          <button
            type="button"
            className="hide-reason-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          {customReason.trim() && (
            <button
              type="button"
              className="hide-reason-btn-confirm"
              onClick={handleConfirmCustom}
              disabled={loading}
              title="Press Ctrl + Enter to confirm"
            >
              {loading ? (
                "Hiding..."
              ) : (
                <>
                  <EyeOff size={14} style={{ marginRight: "0.35rem" }} />
                  Confirm & Hide
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
