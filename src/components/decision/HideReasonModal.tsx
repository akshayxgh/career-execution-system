import { useState, useEffect } from "react";
import { EyeOff, X, Check } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

interface HideReasonModalProps {
  job: DecisionJob | null;
  onConfirm: (jobId: string, reason: string) => void;
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
  onConfirm,
  onCancel,
  loading = false,
}: HideReasonModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  useEffect(() => {
    setSelectedPreset("");
    setCustomReason("");
  }, [job]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  if (!job) return null;

  const handleSelectPreset = (label: string) => {
    if (selectedPreset === label) {
      setSelectedPreset("");
    } else {
      setSelectedPreset(label);
    }
  };

  const handleConfirm = () => {
    const fullReason = [selectedPreset, customReason.trim()]
      .filter(Boolean)
      .join(" - ") || "User marked as hidden";
    onConfirm(job.id, fullReason);
  };

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
              <h2 className="hide-reason-title">Reason to Hide Job</h2>
              <p className="hide-reason-subtitle">
                {job.title} • <span className="hide-reason-company">{job.company_name}</span>
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
            Select a primary reason:
          </label>
          <div className="hide-reason-presets-grid">
            {COMMON_REASONS.map((preset) => {
              const isSelected = selectedPreset === preset.label;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`hide-reason-preset-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectPreset(preset.label)}
                >
                  <span className="hide-reason-preset-icon">{preset.icon}</span>
                  <span className="hide-reason-preset-text">{preset.label}</span>
                  {isSelected && <Check size={14} className="hide-reason-check-icon" />}
                </button>
              );
            })}
          </div>

          <div className="hide-reason-custom-section">
            <label className="hide-reason-label">
              Additional notes or feedback (optional):
            </label>
            <textarea
              className="hide-reason-textarea"
              placeholder="e.g. Requires 5+ yrs Java, but my focus is Data Analysis with Python / Power BI..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
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
          <button
            type="button"
            className="hide-reason-btn-confirm"
            onClick={handleConfirm}
            disabled={loading}
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
        </footer>
      </div>
    </div>
  );
}
