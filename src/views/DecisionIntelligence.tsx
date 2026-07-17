import { useEffect, useMemo, useState } from "react";
import DecisionHeader from "../components/decision/DecisionHeader";
import DecisionTable from "../components/decision/DecisionTable";
import DecisionToolbar from "../components/decision/DecisionToolbar";
import {
  getDecisionJobs,
  type DecisionJob,
} from "../services/decisionIntelligenceService";

const ROWS_PER_PAGE = 25;

export default function DecisionIntelligence() {
  const [jobs, setJobs] = useState<DecisionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setJobs(await getDecisionJobs());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return jobs;
    }

    return jobs.filter((job) => {
      const title = job.title.toLowerCase();
      const company = job.company_name.toLowerCase();

      return title.includes(query) || company.includes(query);
    });
  }, [jobs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleJobs = filteredJobs.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="decision-page">
        <div className="decision-state">
          Loading decision intelligence...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="decision-page">
        <div className="decision-state decision-state-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="decision-page">
      <div className="decision-shell">
        <div className="decision-topbar">
          <DecisionHeader count={jobs.length} />
          <DecisionToolbar search={search} onSearchChange={handleSearchChange} />
        </div>

        <DecisionTable
          jobs={visibleJobs}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={filteredJobs.length}
          rowsPerPage={ROWS_PER_PAGE}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        />
      </div>
    </div>
  );
}
