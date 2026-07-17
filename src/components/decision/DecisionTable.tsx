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

const columnClass =
  "grid min-w-[1120px] grid-cols-[92px_minmax(280px,2.2fr)_minmax(180px,1.2fr)_130px_170px_150px_96px]";

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
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
      <div className="overflow-x-auto">
        <div className={columnClass}>
          <div className="sticky top-0 z-10 contents">
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Score
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Job Title
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Company
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Posted
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Salary
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              Status
            </div>
            <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
              View
            </div>
          </div>

          {jobs.length > 0 ? (
            jobs.map((job) => (
              <DecisionJobRow key={job.id} job={job} columnClass={columnClass} />
            ))
          ) : (
            <div className="col-span-7 px-5 py-12 text-center text-sm text-slate-400">
              No jobs match your search.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {pageStart}-{pageEnd} of {totalResults}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="min-w-16 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="rounded-md border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
