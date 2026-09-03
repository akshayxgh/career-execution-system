import { useEffect, useMemo, useState } from "react";
import DecisionHeader from "../components/decision/DecisionHeader";
import DecisionJobModal from "../components/decision/DecisionJobModal";
import DecisionTable from "../components/decision/DecisionTable";
import DecisionToolbar from "../components/decision/DecisionToolbar";
import {
  getDecisionJobs,
  getCachedDecisionJobs,
  type DecisionJob,
  type DecisionStatus,
  updateDecisionJobStatus,
  updateMultipleDecisionJobStatus,
} from "../services/decisionIntelligenceService";
import JobCopilotWidget from "../components/copilot/JobCopilotWidget";
import HideReasonModal from "../components/decision/HideReasonModal";
import {
  type ColumnFiltersState,
  type FilterColumnKey,
  initialColumnFilters,
} from "../types/decisionFilters";
import { formatToISTShortDate } from "../utils/dateUtils";
import { exportJobsToCSV } from "../utils/csvExportUtils";

const ROWS_PER_PAGE = 25;

type SortColumn =
  | "score"
  | "location"
  | "posted"
  | "analyzed"
  | "scraper"
  | "experience"
  | "salary"
  | "status";
type SortDirection = "asc" | "desc";

function formatPostedDate(postedDate: string | null) {
  if (!postedDate) return "—";
  return formatToISTShortDate(postedDate);
}

function formatScraperName(scraper: string | null | undefined, source: string) {
  const val = scraper || source || "—";
  if (val.toLowerCase().includes("recommended")) return "Recommended";
  if (val.toLowerCase().includes("portal")) return "Portals";
  if (val.toLowerCase().includes("career")) return "Career";
  if (val.toLowerCase().includes("link")) return "Links";
  return val;
}

function formatSalary(salary: string | null) {
  if (!salary) return "—";
  const matches = salary.match(/\d+/g);
  if (!matches || matches.length === 0) return salary;

  const formatAmount = (value: string) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return value;
    const lakhs = amount / 100000;
    const formatted = Number.isInteger(lakhs)
      ? lakhs.toString()
      : lakhs.toFixed(2).replace(/\.?0+$/, "");
    return `₹${formatted}L`;
  };

  if (matches.length === 1) return formatAmount(matches[0]);
  return `${formatAmount(matches[0])} – ${formatAmount(matches[1])}`;
}

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
  const cachedInitial = useMemo(() => getCachedDecisionJobs(), []);
  const [jobs, setJobs] = useState<DecisionJob[]>(cachedInitial);
  const [loading, setLoading] = useState(cachedInitial.length === 0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters);
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedJob, setSelectedJob] = useState<DecisionJob | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState("");
  const [removingJobIds, setRemovingJobIds] = useState<Record<string, boolean>>({});
  const [hidingJob, setHidingJob] = useState<DecisionJob | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isBulkHiding, setIsBulkHiding] = useState(false);

  const loadJobs = async (showLoadingState = true) => {
    try {
      if (showLoadingState && jobs.length === 0) {
        setLoading(true);
      }
      setError("");

      const freshJobs = await getDecisionJobs();
      setJobs(freshJobs);
    } catch (e: unknown) {
      if (jobs.length === 0) {
        setError(e instanceof Error ? e.message : "Error fetching jobs");
      } else {
        console.warn("Background revalidation failed:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(cachedInitial.length === 0);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (columnFilters.scoreMin !== "" || columnFilters.scoreMax !== "") count++;
    if (columnFilters.jobTitle.trim() !== "") count++;
    if (columnFilters.location.trim() !== "") count++;
    if (columnFilters.experience.trim() !== "") count++;
    if (columnFilters.salary.trim() !== "") count++;
    if (columnFilters.postedDates.length > 0) count++;
    if (columnFilters.analyzedDates.length > 0) count++;
    if (columnFilters.scrapers.length > 0) count++;
    if (columnFilters.statuses.length > 0) count++;
    return count;
  }, [columnFilters]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      // 1. Global Search (matches title, company, location, source, hr_email, description, external_id, AND URL)
      if (query) {
        const title = job.title.toLowerCase();
        const company = job.company_name.toLowerCase();
        const loc = (job.location || "").toLowerCase();
        const source = (job.source || "").toLowerCase();
        const email = (job.hr_email || "").toLowerCase();
        const description = (job.description || "").toLowerCase();
        const url = (job.url || "").toLowerCase();
        const externalId = (job.external_id || "").toLowerCase();
        const cleanId = (job.external_id || "").replace(/^[a-zA-Z0-9]+_/, "").toLowerCase();

        const matchesQuery =
          title.includes(query) ||
          company.includes(query) ||
          loc.includes(query) ||
          source.includes(query) ||
          email.includes(query) ||
          description.includes(query) ||
          externalId.includes(query) ||
          cleanId.includes(query) ||
          url.includes(query);

        if (!matchesQuery) return false;
      }


      // 2. Score Filter (Numeric filter: scoreMin, scoreMax)
      if (columnFilters.scoreMin !== "") {
        const minVal = Number(columnFilters.scoreMin);
        if (!Number.isNaN(minVal) && job.score < minVal) return false;
      }
      if (columnFilters.scoreMax !== "") {
        const maxVal = Number(columnFilters.scoreMax);
        if (!Number.isNaN(maxVal) && job.score > maxVal) return false;
      }

      // 3. Job Title & Company Filter (Case-insensitive contains)
      if (columnFilters.jobTitle.trim() !== "") {
        const q = columnFilters.jobTitle.trim().toLowerCase();
        const combined = `${job.title} ${job.company_name}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      // 4. Location Filter (Case-insensitive contains)
      if (columnFilters.location.trim() !== "") {
        const q = columnFilters.location.trim().toLowerCase();
        const loc = (job.location || "—").toLowerCase();
        if (!loc.includes(q)) return false;
      }

      // 5. Experience Filter (Case-insensitive contains)
      if (columnFilters.experience.trim() !== "") {
        const q = columnFilters.experience.trim().toLowerCase();
        const exp = (job.experience || "—").toLowerCase();
        if (!exp.includes(q)) return false;
      }

      // 6. Salary Filter (Case-insensitive contains)
      if (columnFilters.salary.trim() !== "") {
        const q = columnFilters.salary.trim().toLowerCase();
        const sal = (job.salary || "—").toLowerCase();
        const formattedSal = formatSalary(job.salary).toLowerCase();
        if (!sal.includes(q) && !formattedSal.includes(q)) return false;
      }

      // 7. Posted Date Filter (Multi-date select)
      if (columnFilters.postedDates.length > 0) {
        const pDate = formatPostedDate(job.posted_date);
        if (!columnFilters.postedDates.includes(pDate)) return false;
      }

      // 8. Analyzed Date Filter (Multi-date select)
      if (columnFilters.analyzedDates.length > 0) {
        const aDate = formatToISTShortDate(job.analyzed_at);
        if (!columnFilters.analyzedDates.includes(aDate)) return false;
      }

      // 9. Scraper Filter (Multi-option select)
      if (columnFilters.scrapers.length > 0) {
        const scraperName = formatScraperName(job.scraper, job.source);
        if (!columnFilters.scrapers.includes(scraperName)) return false;
      }

      // 10. Status Filter (Multi-option select)
      if (columnFilters.statuses.length > 0) {
        if (!columnFilters.statuses.includes(job.my_status)) return false;
      }

      return true;
    });
  }, [jobs, search, columnFilters]);

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

      if (sortColumn === "location") {
        const aLoc = (a.location || "").toLowerCase();
        const bLoc = (b.location || "").toLowerCase();
        result = aLoc.localeCompare(bLoc) * directionModifier;
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

      if (sortColumn === "scraper") {
        const aScraper = (a.scraper || a.source || "").toLowerCase();
        const bScraper = (b.scraper || b.source || "").toLowerCase();
        result = aScraper.localeCompare(bScraper) * directionModifier;
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

  const isAllSelected = useMemo(() => {
    if (sortedJobs.length === 0) return false;
    return sortedJobs.every((j) => selectedJobIds.has(j.id));
  }, [sortedJobs, selectedJobIds]);

  const handleToggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(sortedJobs.map((j) => j.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const handleTriggerBulkHide = () => {
    if (selectedJobIds.size === 0) return;
    setIsBulkHiding(true);
  };

  const selectedJobsToHide = useMemo(() => {
    if (!isBulkHiding) return [];
    return jobs.filter((j) => selectedJobIds.has(j.id));
  }, [isBulkHiding, jobs, selectedJobIds]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleApplyFilter = (updated: Partial<ColumnFiltersState>) => {
    setColumnFilters((prev) => ({ ...prev, ...updated }));
    setPage(1);
  };

  const handleClearColumnFilter = (col: FilterColumnKey) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (col === "score") {
        next.scoreMin = "";
        next.scoreMax = "";
      } else if (col === "jobTitle") {
        next.jobTitle = "";
      } else if (col === "location") {
        next.location = "";
      } else if (col === "experience") {
        next.experience = "";
      } else if (col === "salary") {
        next.salary = "";
      } else if (col === "posted") {
        next.postedDates = [];
      } else if (col === "analyzed") {
        next.analyzedDates = [];
      } else if (col === "scraper") {
        next.scrapers = [];
      } else if (col === "status") {
        next.statuses = [];
      }
      return next;
    });
    setPage(1);
  };

  const handleResetAllFilters = () => {
    setColumnFilters(initialColumnFilters);
    setSearch("");
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

    if (status === "HIDDEN") {
      setHidingJob(selectedJob);
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

      if (status !== "NEW") {
        const jobId = selectedJob.id;
        setRemovingJobIds((prev) => ({ ...prev, [jobId]: true }));
        setTimeout(() => {
          setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
          setRemovingJobIds((prev) => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }, 300);
        setSelectedJob(null);
      }
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
    if (status === "HIDDEN") {
      const target = jobs.find((j) => j.id === jobId);
      if (target) {
        setHidingJob(target);
      }
      return;
    }

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

      if (status !== "NEW") {
        setRemovingJobIds((prev) => ({ ...prev, [jobId]: true }));
        setTimeout(() => {
          setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
          setRemovingJobIds((prev) => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }, 300);
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleConfirmHide = async (reason: string) => {
    setSavingStatus(true);
    setStatusSaveError("");

    try {
      if (isBulkHiding && selectedJobIds.size > 0) {
        const ids = Array.from(selectedJobIds);
        await updateMultipleDecisionJobStatus(ids, "HIDDEN", reason);

        const now = new Date().toISOString();
        const idMap = new Set(ids);

        setJobs((currentJobs) =>
          currentJobs.map((job) =>
            idMap.has(job.id)
              ? {
                  ...job,
                  my_status: "HIDDEN",
                  status_updated_at: now,
                }
              : job,
          ),
        );

        if (selectedJob && idMap.has(selectedJob.id)) {
          setSelectedJob(null);
        }

        setIsBulkHiding(false);
        setSelectedJobIds(new Set());

        const removingMap: Record<string, boolean> = {};
        ids.forEach((id) => {
          removingMap[id] = true;
        });
        setRemovingJobIds((prev) => ({ ...prev, ...removingMap }));

        setTimeout(() => {
          setJobs((currentJobs) => currentJobs.filter((job) => !idMap.has(job.id)));
          setRemovingJobIds((prev) => {
            const next = { ...prev };
            ids.forEach((id) => {
              delete next[id];
            });
            return next;
          });
        }, 300);
      } else if (hidingJob) {
        const jobId = hidingJob.id;
        await updateDecisionJobStatus(jobId, "HIDDEN", reason);

        setJobs((currentJobs) =>
          currentJobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  my_status: "HIDDEN",
                  status_updated_at: new Date().toISOString(),
                }
              : job,
          ),
        );

        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }

        setHidingJob(null);

        setRemovingJobIds((prev) => ({ ...prev, [jobId]: true }));
        setTimeout(() => {
          setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
          setRemovingJobIds((prev) => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }, 300);
      }
    } catch (e: unknown) {
      setStatusSaveError(
        e instanceof Error ? e.message : "Unable to hide jobs.",
      );
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

  const handleExportSelectedCSV = () => {
    if (selectedJobIds.size === 0) return;
    const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));
    exportJobsToCSV(selectedJobs, `selected_jobs_${selectedJobs.length}`);
  };

  return (
    <div className="decision-page">
      <div className="decision-shell">
        <div className="decision-topbar">
          <DecisionHeader
            totalCount={jobs.length}
            filteredCount={sortedJobs.length}
          />
          <DecisionToolbar
            search={search}
            onSearchChange={handleSearchChange}
            activeFiltersCount={activeFiltersCount}
            onResetAllFilters={handleResetAllFilters}
            selectedCount={selectedJobIds.size}
            totalResults={sortedJobs.length}
            isAllSelected={isAllSelected}
            isPartiallySelected={selectedJobIds.size > 0 && !isAllSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkHide={handleTriggerBulkHide}
            onExportCSV={handleExportSelectedCSV}
            onClearSelection={handleClearSelection}
          />
        </div>

        <DecisionTable
          jobs={visibleJobs}
          allJobs={jobs}
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
          removingJobIds={removingJobIds}
          filters={columnFilters}
          onApplyFilter={handleApplyFilter}
          onClearColumnFilter={handleClearColumnFilter}
          onResetAllFilters={handleResetAllFilters}
          activeFiltersCount={activeFiltersCount}
          selectedJobIds={selectedJobIds}
          onToggleSelectJob={handleToggleSelectJob}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          onBulkHide={handleTriggerBulkHide}
          onClearSelection={handleClearSelection}
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

        <JobCopilotWidget job={selectedJob} />

        <HideReasonModal
          job={hidingJob}
          jobsToHide={selectedJobsToHide}
          onConfirm={handleConfirmHide}
          onCancel={() => {
            setHidingJob(null);
            setIsBulkHiding(false);
          }}
          loading={savingStatus}
        />
      </div>
    </div>
  );
}
