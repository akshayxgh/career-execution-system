import { Search, Filter, EyeOff, CheckSquare, Square, MinusSquare } from "lucide-react";

interface DecisionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFiltersCount?: number;
  onResetAllFilters?: () => void;
  selectedCount?: number;
  totalResults?: number;
  isAllSelected?: boolean;
  isPartiallySelected?: boolean;
  onToggleSelectAll?: () => void;
  onBulkHide?: () => void;
  onClearSelection?: () => void;
}

export default function DecisionToolbar({
  search,
  onSearchChange,
  activeFiltersCount = 0,
  onResetAllFilters,
  selectedCount = 0,
  totalResults = 0,
  isAllSelected = false,
  isPartiallySelected = false,
  onToggleSelectAll,
  onBulkHide,
  onClearSelection,
}: DecisionToolbarProps) {
  return (
    <div className="decision-toolbar">
      {/* Centered Selection Component */}
      {selectedCount > 0 && (
        <div className="decision-toolbar-selection">
          {onToggleSelectAll && (
            <button
              type="button"
              className="decision-select-all-btn"
              onClick={onToggleSelectAll}
              title={isAllSelected ? "Deselect All Jobs" : `Select All (${totalResults} jobs)`}
              aria-label="Select All Toggle"
              style={{ padding: "0.15rem" }}
            >
              {isAllSelected ? (
                <CheckSquare size={17} style={{ color: "#38bdf8" }} />
              ) : isPartiallySelected ? (
                <MinusSquare size={17} style={{ color: "#38bdf8" }} />
              ) : (
                <Square size={17} style={{ color: "#64748b" }} />
              )}
            </button>
          )}
          <span className="decision-bulk-count">{selectedCount}</span>
          <span className="decision-bulk-text">job{selectedCount > 1 ? "s" : ""} selected</span>
          {onBulkHide && (
            <button
              type="button"
              className="decision-bulk-hide-btn"
              onClick={onBulkHide}
            >
              <EyeOff size={13} /> Hide ({selectedCount})
            </button>
          )}
          {onClearSelection && (
            <button
              type="button"
              className="decision-bulk-cancel-btn"
              onClick={onClearSelection}
            >
              Deselect All
            </button>
          )}
        </div>
      )}

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && onResetAllFilters && (
        <button
          type="button"
          className="decision-toolbar-filter-badge"
          onClick={onResetAllFilters}
          title="Click to reset all active filters"
        >
          <Filter size={13} />
          <span>{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active</span>
        </button>
      )}

      {/* Searchbar staying on the RIGHT as it was */}
      <label className="decision-search">
        <Search className="decision-search-icon" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, company, URL or source..."
        />
      </label>
    </div>
  );
}

