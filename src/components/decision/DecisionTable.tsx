import { useState, useMemo, type ReactNode } from "react";
import { RotateCcw, Filter, CheckSquare, Square, MinusSquare } from "lucide-react";
import type {
  DecisionJob,
  DecisionStatus,
} from "../../services/decisionIntelligenceService";
import DecisionJobRow from "./DecisionJobRow";
import ColumnFilterPopover from "./ColumnFilterPopover";
import type { FilterColumnKey, ColumnFiltersState } from "../../types/decisionFilters";

export type DecisionSortColumn =
  | "score"
  | "posted"
  | "analyzed"
  | "scraper"
  | "experience"
  | "salary"
  | "status";

export type DecisionSortDirection = "asc" | "desc";

interface DecisionTableProps {
  jobs: DecisionJob[];
  allJobs: DecisionJob[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  rowsPerPage: number;
  sortColumn: DecisionSortColumn | null;
  sortDirection: DecisionSortDirection;
  onSort: (column: DecisionSortColumn) => void;
  onStatusChange: (jobId: string, status: DecisionStatus) => void;
  onOpenJob: (job: DecisionJob) => void;
  onResetSorting?: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  removingJobIds?: Record<string, boolean>;
  filters: ColumnFiltersState;
  onApplyFilter: (updated: Partial<ColumnFiltersState>) => void;
  onClearColumnFilter: (column: FilterColumnKey) => void;
  onResetAllFilters: () => void;
  activeFiltersCount: number;

  // Selection Props
  selectedJobIds: Set<string>;
  onToggleSelectJob: (jobId: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  onBulkHide?: () => void;
  onClearSelection?: () => void;
}

interface TableHeaderCellProps {
  columnKey: FilterColumnKey;
  sortColumn?: DecisionSortColumn;
  label: string;
  activeSortColumn: DecisionSortColumn | null;
  direction: DecisionSortDirection;
  onSort?: (column: DecisionSortColumn) => void;
  filters: ColumnFiltersState;
  onApplyFilter: (updated: Partial<ColumnFiltersState>) => void;
  onClearColumnFilter: (column: FilterColumnKey) => void;
  allJobs: DecisionJob[];
  activePopover: FilterColumnKey | null;
  onTogglePopover: (column: FilterColumnKey) => void;
  onClosePopover: () => void;
  className?: string;
  prefix?: ReactNode;
}

function TableHeaderCell({
  columnKey,
  sortColumn,
  label,
  activeSortColumn,
  direction,
  onSort,
  filters,
  onApplyFilter,
  onClearColumnFilter,
  allJobs,
  activePopover,
  onTogglePopover,
  onClosePopover,
  className = "",
  prefix,
}: TableHeaderCellProps) {
  const isSortActive = sortColumn && activeSortColumn === sortColumn;
  const isFilterActive = useMemo(() => {
    if (columnKey === "score") return filters.scoreMin !== "" || filters.scoreMax !== "";
    if (columnKey === "jobTitle") return filters.jobTitle.trim() !== "";
    if (columnKey === "posted") return filters.postedDates.length > 0;
    if (columnKey === "analyzed") return filters.analyzedDates.length > 0;
    if (columnKey === "scraper") return filters.scrapers.length > 0;
    if (columnKey === "experience") return filters.experience.trim() !== "";
    if (columnKey === "salary") return filters.salary.trim() !== "";
    if (columnKey === "status") return filters.statuses.length > 0;
    return false;
  }, [columnKey, filters]);

  const isOpen = activePopover === columnKey;

  return (
    <div className={`decision-th ${className}`} style={{ position: "relative" }}>
      {prefix}
      <div className="decision-th-inner">
        {sortColumn && onSort ? (
          <button
            type="button"
            className="decision-sort-button"
            onClick={() => onSort(sortColumn)}
            aria-sort={isSortActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
          >
            <span>{label}</span>
            {isSortActive ? (
              <span className="decision-sort-indicator">
                {direction === "asc" ? "▲" : "▼"}
              </span>
            ) : null}
          </button>
        ) : (
          <span className="decision-th-text">{label}</span>
        )}

        <button
          type="button"
          className={`decision-filter-trigger ${isFilterActive ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePopover(columnKey);
          }}
          title={`Filter ${label}`}
          aria-label={`Filter ${label}`}
        >
          <Filter size={11} />
          {isFilterActive && <span className="decision-filter-active-pip" />}
        </button>
      </div>

      {isOpen && (
        <ColumnFilterPopover
          column={columnKey}
          label={label}
          filters={filters}
          onApplyFilter={onApplyFilter}
          onClearColumnFilter={onClearColumnFilter}
          onClose={onClosePopover}
          allJobs={allJobs}
          isFilterActive={isFilterActive}
        />
      )}
    </div>
  );
}

export default function DecisionTable({
  jobs,
  allJobs,
  currentPage,
  totalPages,
  totalResults,
  rowsPerPage,
  sortColumn,
  sortDirection,
  onSort,
  onOpenJob,
  onStatusChange,
  onPreviousPage,
  onNextPage,
  removingJobIds = {},
  filters,
  onApplyFilter,
  onClearColumnFilter,
  onResetAllFilters,
  activeFiltersCount,
  selectedJobIds,
  onToggleSelectJob,
  onToggleSelectAll,
  isAllSelected,
}: DecisionTableProps) {
  const [activePopover, setActivePopover] = useState<FilterColumnKey | null>(null);

  const handleTogglePopover = (col: FilterColumnKey) => {
    setActivePopover((prev) => (prev === col ? null : col));
  };

  const handleClosePopover = () => {
    setActivePopover(null);
  };

  const pageStart = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, totalResults);
  const selectedCount = selectedJobIds.size;
  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  return (
    <section className="decision-table-frame">
      <div className="decision-mobile-sort-bar">
        <span className="decision-mobile-sort-label">Sort:</span>
        <div className="decision-mobile-sort-chips">
          <button
            type="button"
            className={`decision-sort-chip ${sortColumn === 'score' ? 'active' : ''}`}
            onClick={() => onSort('score')}
          >
            Score {sortColumn === 'score' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            className={`decision-sort-chip ${sortColumn === 'posted' ? 'active' : ''}`}
            onClick={() => onSort('posted')}
          >
            Posted {sortColumn === 'posted' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            className={`decision-sort-chip ${sortColumn === 'salary' ? 'active' : ''}`}
            onClick={() => onSort('salary')}
          >
            Salary {sortColumn === 'salary' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            className={`decision-sort-chip ${sortColumn === 'experience' ? 'active' : ''}`}
            onClick={() => onSort('experience')}
          >
            Exp {sortColumn === 'experience' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            className={`decision-sort-chip ${sortColumn === 'status' ? 'active' : ''}`}
            onClick={() => onSort('status')}
          >
            Status {sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
      </div>

      <div className="decision-table-scroll">
        <div className="decision-table">
          <div className="decision-table-header">
            <TableHeaderCell
              columnKey="score"
              sortColumn="score"
              label="Score"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
              className="decision-th-score"
              prefix={
                <button
                  type="button"
                  className={`decision-select-all-btn ${selectedCount > 0 ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectAll();
                  }}
                  title={
                    isAllSelected
                      ? "Deselect All Filtered Jobs"
                      : isPartiallySelected
                      ? `Select All (${totalResults} jobs)`
                      : `Select All (${totalResults} jobs)`
                  }
                  aria-label="Select All Checkbox"
                  style={{ marginRight: "0.25rem" }}
                >
                  {isAllSelected ? (
                    <CheckSquare size={16} style={{ color: "#38bdf8" }} />
                  ) : isPartiallySelected ? (
                    <MinusSquare size={16} style={{ color: "#38bdf8" }} />
                  ) : (
                    <Square size={16} style={{ color: "#64748b" }} />
                  )}
                </button>
              }
            />

            <TableHeaderCell
              columnKey="jobTitle"
              label="Job Title"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
              className="decision-th-job-title"
            />

            <TableHeaderCell
              columnKey="posted"
              sortColumn="posted"
              label="Posted"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <TableHeaderCell
              columnKey="analyzed"
              sortColumn="analyzed"
              label="Analyzed"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <TableHeaderCell
              columnKey="scraper"
              sortColumn="scraper"
              label="Source"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <TableHeaderCell
              columnKey="experience"
              sortColumn="experience"
              label="Experience"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <TableHeaderCell
              columnKey="salary"
              sortColumn="salary"
              label="Salary"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <TableHeaderCell
              columnKey="status"
              sortColumn="status"
              label="Status"
              activeSortColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearColumnFilter={onClearColumnFilter}
              allJobs={allJobs}
              activePopover={activePopover}
              onTogglePopover={handleTogglePopover}
              onClosePopover={handleClosePopover}
            />

            <div className="decision-th">
              Details
            </div>
          </div>

          {jobs.length > 0 ? (
            jobs.map((job) => (
              <DecisionJobRow 
                key={job.id} 
                job={job} 
                onOpenJob={onOpenJob} 
                onStatusChange={onStatusChange} 
                isRemoving={removingJobIds[job.id]}
                isSelected={selectedJobIds.has(job.id)}
                onToggleSelect={onToggleSelectJob}
              />
            ))
          ) : (
            <div className="decision-empty">
              No jobs match your active filters or search.
              {activeFiltersCount > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onResetAllFilters}
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                  >
                    <RotateCcw size={13} style={{ marginRight: "0.35rem" }} /> Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="decision-pagination">
        <span>
          Showing {pageStart}-{pageEnd} of {totalResults}
        </span>
        <div className="decision-pagination-actions">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="decision-page-count">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
