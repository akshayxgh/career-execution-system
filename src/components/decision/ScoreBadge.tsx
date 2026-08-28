import { Check } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

function getScoreColor(score: number) {
  if (score >= 90) {
    return "score-badge-green";
  }

  if (score >= 75) {
    return "score-badge-blue";
  }

  if (score >= 60) {
    return "score-badge-yellow";
  }

  return "score-badge-red";
}

export default function ScoreBadge({ score, isSelected = false, onToggleSelect }: ScoreBadgeProps) {
  return (
    <span
      className={`score-badge ${getScoreColor(score)} ${isSelected ? "score-badge-selected" : ""} ${onToggleSelect ? "score-badge-selectable" : ""}`}
      onClick={(e) => {
        if (onToggleSelect) {
          e.stopPropagation();
          onToggleSelect(e);
        }
      }}
      title={onToggleSelect ? (isSelected ? "Deselect job" : "Select job") : undefined}
      role={onToggleSelect ? "checkbox" : undefined}
      aria-checked={onToggleSelect ? isSelected : undefined}
    >
      {isSelected ? (
        <Check size={14} className="score-badge-check-icon" strokeWidth={3} />
      ) : (
        score
      )}
    </span>
  );
}

