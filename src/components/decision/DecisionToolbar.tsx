import { Search, RotateCcw, Filter } from "lucide-react";

interface DecisionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFiltersCount?: number;
  onResetAllFilters?: () => void;
}

export default function DecisionToolbar({
  search,
  onSearchChange,
  activeFiltersCount = 0,
  onResetAllFilters,
}: DecisionToolbarProps) {
  return (
    <div className="decision-toolbar">
      {activeFiltersCount > 0 && onResetAllFilters && (
        <button
          type="button"
          className="decision-toolbar-filter-badge"
          onClick={onResetAllFilters}
          title="Click to reset all active filters"
        >
          <Filter size={13} />
          <span>{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active</span>
          <RotateCcw size={12} style={{ marginLeft: "0.25rem" }} />
        </button>
      )}

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
