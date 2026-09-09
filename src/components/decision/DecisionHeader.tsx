import { Sparkles } from "lucide-react";

interface DecisionHeaderProps {
  totalCount: number;
  filteredCount: number;
  naukriCount?: number;
  onOpenNaukriCheck?: () => void;
}

export default function DecisionHeader({
  totalCount,
  filteredCount,
  naukriCount = 0,
  onOpenNaukriCheck,
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

      {onOpenNaukriCheck && (
        <div className="decision-header-actions">
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
        </div>
      )}
    </header>
  );
}

