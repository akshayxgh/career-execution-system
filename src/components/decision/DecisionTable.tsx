import type { DecisionJob } from "../../services/decisionIntelligenceService";
import DecisionJobRow from "./DecisionJobRow";

interface DecisionTableProps {
  jobs: DecisionJob[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  rowsPerPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function DecisionTable({
  jobs,
  currentPage,
  totalPages,
  totalResults,
  rowsPerPage,
  onPreviousPage,
  onNextPage,
}: DecisionTableProps) {
  const pageStart = totalResults === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, totalResults);

  return (
    <section className="decision-table-frame">
      <div className="decision-table-scroll">
        <div className="decision-table">
          <div className="decision-table-header">
            <div className="decision-th decision-th-score">
              Score
            </div>
            <div className="decision-th">
              Job Title
            </div>
            <div className="decision-th">
              Posted
            </div>
            <div className="decision-th">
              Analyzed
            </div>
            <div className="decision-th">
              Experience
            </div>
            <div className="decision-th">
              Salary
            </div>
            <div className="decision-th">
              Status
            </div>
            <div className="decision-th">
              Details
            </div>
          </div>

          {jobs.length > 0 ? (
            jobs.map((job) => (
              <DecisionJobRow key={job.id} job={job} />
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
