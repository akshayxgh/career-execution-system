import { Sparkles, Zap } from "lucide-react";

interface DecisionHeaderProps {
  totalCount: number;
  filteredCount: number;
  naukriCount?: number;
  shineCount?: number;
  onOpenNaukriCheck?: () => void;
  onOpenShineApply?: () => void;
}

export default function DecisionHeader({
  totalCount,
  filteredCount,
  naukriCount = 0,
  shineCount = 0,
  onOpenNaukriCheck,
  onOpenShineApply,
}: DecisionHeaderProps) {
  const isFiltered = filteredCount !== totalCount;

  return (
    <header className="decision-header">
      <div className="decision-header-info">
        <h1>Decision Intelligence</h1>
        <p>
          {isFiltered ? (
            <>
              Showing <span className="decision-header-filtered-badge">{filteredCount.toLocaleString()}</span> of{" "}
              {totalCount.toLocaleString()} Recommended Jobs
            </>
          ) : (
            `${totalCount.toLocaleString()} Recommended Jobs`
          )}
        </p>
      </div>

      <div className="decision-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {onOpenShineApply && shineCount > 0 && (
          <button
            type="button"
            className="naukri-check-trigger-btn"
            style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4", color: "#166534" }}
            onClick={onOpenShineApply}
            title="Auto-apply to all visible Shine jobs using browser companion"
          >
            <Zap size={15} style={{ color: "#16a34a" }} />
            <span>Auto-Apply Shine</span>
            <span className="naukri-check-badge" style={{ backgroundColor: "#16a34a" }}>{shineCount}</span>
          </button>
        )}

        {onOpenNaukriCheck && (
          <button
            type="button"
            className="naukri-check-trigger-btn"
            onClick={onOpenNaukriCheck}
            title="Check already applied jobs on Naukri using browser companion"
          >
            <Sparkles size={15} style={{ color: "#38bdf8" }} />
            <span>Check Naukri Applied</span>
            {naukriCount > 0 && (
              <span className="naukri-check-badge">{naukriCount}</span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
