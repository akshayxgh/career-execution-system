import { useEffect, useMemo, useState } from "react";
import DecisionHeader from "../components/decision/DecisionHeader";
import DecisionJobModal from "../components/decision/DecisionJobModal";
import DecisionTable from "../components/decision/DecisionTable";
import DecisionToolbar from "../components/decision/DecisionToolbar";
import {
  getDecisionJobs,
  type DecisionJob,
  type DecisionStatus,
  updateDecisionJobStatus,
} from "../services/decisionIntelligenceService";

const ROWS_PER_PAGE = 25;

type SortColumn =
  | "score"
  | "posted"
  | "analyzed"
  | "experience"
  | "salary"
  | "status";
type SortDirection = "asc" | "desc";

function getDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function getMinimumNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+/);

  if (!match) {
    return null;
  }

  const number = Number(match[0]);

  return Number.isFinite(number) ? number : null;
}

function compareNullableValues<T>(
  aValue: T | null,
  bValue: T | null,
  compare: (a: T, b: T) => number,
  directionModifier = 1,
) {
  if (aValue === null && bValue === null) {
    return 0;
  }

  if (aValue === null) {
    return 1;
  }

  if (bValue === null) {
    return -1;
  }

  return compare(aValue, bValue) * directionModifier;
}

export default function DecisionIntelligence() {
  const [jobs, setJobs] = useState<DecisionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedJob, setSelectedJob] = useState<DecisionJob | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");

      setJobs(await getDecisionJobs());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return jobs;
    }

    return jobs.filter((job) => {
      const title = job.title.toLowerCase();
      const company = job.company_name.toLowerCase();
      const source = (job.source || "").toLowerCase();

      return title.includes(query) || company.includes(query) || source.includes(query);
    });
  }, [jobs, search]);

  const sortedJobs = useMemo(() => {
    if (!sortColumn) {
      return filteredJobs;
    }

    const directionModifier = sortDirection === "asc" ? 1 : -1;

    return [...filteredJobs].sort((a, b) => {
      let result = 0;

      if (sortColumn === "score") {
        result = (a.score - b.score) * directionModifier;
      }

      if (sortColumn === "posted") {
        result = compareNullableValues(
          getDateValue(a.posted_date),
          getDateValue(b.posted_date),
          (aValue, bValue) => aValue - bValue,
          directionModifier,
        );
      }

      if (sortColumn === "analyzed") {
        result = compareNullableValues(
          getDateValue(a.analyzed_at),
          getDateValue(b.analyzed_at),
          (aValue, bValue) => aValue - bValue,
          directionModifier,
        );
      }

      if (sortColumn === "experience") {
        result = compareNullableValues(
          getMinimumNumber(a.experience),
          getMinimumNumber(b.experience),
          (aValue, bValue) => aValue - bValue,
          directionModifier,
        );
      }

      if (sortColumn === "salary") {
        result = compareNullableValues(
          getMinimumNumber(a.salary),
          getMinimumNumber(b.salary),
          (aValue, bValue) => aValue - bValue,
          directionModifier,
        );
      }

      if (sortColumn === "status") {
        result = a.my_status.localeCompare(b.my_status) * directionModifier;
      }

      return result;
    });
  }, [filteredJobs, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleJobs = sortedJobs.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleResetSorting = async () => {
    setSortColumn(null);
    setSortDirection("asc");
    setPage(1);

    await loadJobs();
  };

  const handleOpenJob = (job: DecisionJob) => {
    setStatusSaveError("");
    setSelectedJob(job);
  };

  const handleSaveStatus = async (status: DecisionStatus) => {
    if (!selectedJob) {
      return;
    }

    setSavingStatus(true);
    setStatusSaveError("");

    try {
      await updateDecisionJobStatus(selectedJob.id, status);

      const updatedJob = {
        ...selectedJob,
        my_status: status,
        status_updated_at: new Date().toISOString(),
      };

      setJobs((currentJobs) =>
        currentJobs.map((job) => (job.id === selectedJob.id ? updatedJob : job)),
      );
      setSelectedJob(updatedJob);
    } catch (e: unknown) {
      setStatusSaveError(
        e instanceof Error ? e.message : "Unable to save status.",
      );
    } finally {
      setSavingStatus(false);
    }
  };
  
  const handleTableStatusChange = async (
    jobId: string,
    status: DecisionStatus,
  ) => {
    setSavingStatus(true);

    try {
      await updateDecisionJobStatus(jobId, status);
      

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                my_status: status,
                status_updated_at: new Date().toISOString(),
              }
            : job,
        ),
      );

      if (selectedJob?.id === jobId) {
        setSelectedJob((current) =>
          current
            ? {
                ...current,
                my_status: status,
                status_updated_at: new Date().toISOString(),
              }
            : null,
        );
      }
    } finally {
      setSavingStatus(false);
    }
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
          totalResults={sortedJobs.length}
          rowsPerPage={ROWS_PER_PAGE}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onOpenJob={handleOpenJob}
          onStatusChange={handleTableStatusChange}
          onResetSorting={handleResetSorting}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        />

        {selectedJob ? (
          <DecisionJobModal
            job={selectedJob}
            saving={savingStatus}
            saveError={statusSaveError}
            onClose={() => setSelectedJob(null)}
            onSaveStatus={handleSaveStatus}
          />
        ) : null}
      </div>
    </div>
  );
}
