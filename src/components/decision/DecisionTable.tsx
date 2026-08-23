import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type {
  DecisionJob,
  DecisionStatus,
} from "../../services/decisionIntelligenceService";
import DecisionJobRow from "./DecisionJobRow";

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
  currentPage: number;
  totalPages: number;
  totalResults: number;
  rowsPerPage: number;
  sortColumn: DecisionSortColumn | null;
  sortDirection: DecisionSortDirection;
  onSort: (column: DecisionSortColumn) => void;
  onStatusChange: (jobId: string, status: DecisionStatus) => void;
  onOpenJob: (job: DecisionJob) => void;
  onResetSorting: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  removingJobIds?: Record<string, boolean>;
}

interface SortableHeaderProps {
  column: DecisionSortColumn;
  label: string;
  activeColumn: DecisionSortColumn | null;
  direction: DecisionSortDirection;
  onSort: (column: DecisionSortColumn) => void;
  className?: string;
  prefix?: ReactNode;
}

function SortableHeader({
  column,
  label,
  activeColumn,
  direction,
  onSort,
  className = "",
  prefix,
}: SortableHeaderProps) {
  const isActive = activeColumn === column;

  return (
    <div className={`decision-th ${className}`}>
      {prefix}
      <button
        type="button"
        className="decision-sort-button"
        onClick={() => onSort(column)}
        aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {isActive ? (
          <span className="decision-sort-indicator">
            {direction === "asc" ? "▲" : "▼"}
          </span>
        ) : null}
      </button>
    </div>
  );
}

export default function DecisionTable({
  jobs,
  currentPage,
  totalPages,
  totalResults,
  rowsPerPage,
  sortColumn,
  sortDirection,
  onSort,
  onOpenJob,
  onResetSorting,
  onStatusChange,
  onPreviousPage,
  onNextPage,
  removingJobIds = {},
}: DecisionTableProps) {
  const pageStart = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, totalResults);

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
          {sortColumn && (
            <button
              type="button"
              className="decision-sort-chip decision-sort-reset"
              onClick={onResetSorting}
              title="Reset sorting"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="decision-table-scroll">
        <div className="decision-table">
          <div className="decision-table-header">
            <SortableHeader
              column="score"
              label="Score"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
              className="decision-th-score"
              prefix={
                <button
                  type="button"
                  className="decision-reset-button"
                  onClick={onResetSorting}
                  title="Reset Sorting & Filters"
                  aria-label="Reset Sorting & Filters"
                >
                  <RotateCcw className="decision-reset-icon" />
                </button>
              }
            />
            <div className="decision-th">
              Job Title
            </div>
            <SortableHeader
              column="posted"
              label="Posted"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              column="analyzed"
              label="Analyzed"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              column="scraper"
              label="Scraper"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              column="experience"
              label="Experience"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
            />

            <SortableHeader
              column="salary"
              label="Salary"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableHeader
              column="status"
              label="Status"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={onSort}
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
              />
            ))
          ) : (
            <div className="decision-empty">
              No jobs match your search.
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
