import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, RotateCcw } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";
import type { FilterColumnKey, ColumnFiltersState } from "../../types/decisionFilters";
import { formatToISTShortDate } from "../../utils/dateUtils";

interface ColumnFilterPopoverProps {
  column: FilterColumnKey;
  label: string;
  filters: ColumnFiltersState;
  onApplyFilter: (updated: Partial<ColumnFiltersState>) => void;
  onClearColumnFilter: (column: FilterColumnKey) => void;
  onClose: () => void;
  allJobs: DecisionJob[];
  isFilterActive: boolean;
}

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

export default function ColumnFilterPopover({
  column,
  label,
  filters,
  onApplyFilter,
  onClearColumnFilter,
  onClose,
  allJobs,
  isFilterActive,
}: ColumnFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Local draft state so user can select/deselect and click "Apply"
  const [localScoreMin, setLocalScoreMin] = useState(filters.scoreMin);
  const [localScoreMax, setLocalScoreMax] = useState(filters.scoreMax);
  const [localTextQuery, setLocalTextQuery] = useState(() => {
    if (column === "jobTitle") return filters.jobTitle;
    if (column === "location") return filters.location;
    if (column === "experience") return filters.experience;
    if (column === "salary") return filters.salary;
    return "";
  });
  const [localPostedDates, setLocalPostedDates] = useState<string[]>(filters.postedDates);
  const [localAnalyzedDates, setLocalAnalyzedDates] = useState<string[]>(filters.analyzedDates);
  const [localScrapers, setLocalScrapers] = useState<string[]>(filters.scrapers);
  const [localStatuses, setLocalStatuses] = useState<string[]>(filters.statuses);

  // Search filter within checkbox items
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Compute distinct options & counts for multi-select columns
  const optionsWithCounts = useMemo(() => {
    const countsMap = new Map<string, number>();

    if (column === "posted") {
      allJobs.forEach((job) => {
        const val = formatPostedDate(job.posted_date);
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "analyzed") {
      allJobs.forEach((job) => {
        const val = formatToISTShortDate(job.analyzed_at);
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "scraper") {
      allJobs.forEach((job) => {
        const val = formatScraperName(job.scraper, job.source);
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "status") {
      allJobs.forEach((job) => {
        const val = job.my_status;
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "location") {
      allJobs.forEach((job) => {
        const val = job.location?.trim() || "—";
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "experience") {
      allJobs.forEach((job) => {
        const val = job.experience?.trim() || "—";
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    } else if (column === "salary") {
      allJobs.forEach((job) => {
        const val = job.salary?.trim() || "—";
        countsMap.set(val, (countsMap.get(val) || 0) + 1);
      });
    }

    return Array.from(countsMap.entries()).map(([value, count]) => ({
      value,
      count,
    }));
  }, [column, allJobs]);

  const filteredOptions = useMemo(() => {
    if (!itemSearchQuery.trim()) return optionsWithCounts;
    const q = itemSearchQuery.toLowerCase();
    return optionsWithCounts.filter((opt) => opt.value.toLowerCase().includes(q));
  }, [optionsWithCounts, itemSearchQuery]);

  // Handle Apply
  const handleApply = () => {
    if (column === "score") {
      onApplyFilter({ scoreMin: localScoreMin, scoreMax: localScoreMax });
    } else if (column === "jobTitle") {
      onApplyFilter({ jobTitle: localTextQuery });
    } else if (column === "location") {
      onApplyFilter({ location: localTextQuery });
    } else if (column === "experience") {
      onApplyFilter({ experience: localTextQuery });
    } else if (column === "salary") {
      onApplyFilter({ salary: localTextQuery });
    } else if (column === "posted") {
      onApplyFilter({ postedDates: localPostedDates });
    } else if (column === "analyzed") {
      onApplyFilter({ analyzedDates: localAnalyzedDates });
    } else if (column === "scraper") {
      onApplyFilter({ scrapers: localScrapers });
    } else if (column === "status") {
      onApplyFilter({ statuses: localStatuses });
    }
    onClose();
  };

  const handleClear = () => {
    onClearColumnFilter(column);
    onClose();
  };

  // Toggle item in multi-select array
  const toggleArrayItem = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => {
    if (currentList.includes(val)) {
      setList(currentList.filter((item) => item !== val));
    } else {
      setList([...currentList, val]);
    }
  };

  // Select all / Deselect all
  const handleSelectAll = (
    allValues: string[],
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.length === allValues.length) {
      setList([]);
    } else {
      setList([...allValues]);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="decision-filter-popover"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="decision-filter-header">
        <span className="decision-filter-title">Filter {label}</span>
        <button
          type="button"
          className="decision-filter-close"
          onClick={onClose}
          aria-label="Close filter"
        >
          <X size={14} />
        </button>
      </div>

      <div className="decision-filter-body">
        {/* 1. SCORE FILTER (Numeric Filter) */}
        {column === "score" && (
          <div className="decision-filter-score-content">
            <div className="decision-filter-presets">
              <span className="decision-filter-preset-label">Presets:</span>
              <div className="decision-filter-preset-buttons">
                <button
                  type="button"
                  className={`decision-filter-preset-btn ${localScoreMin === "85" && localScoreMax === "" ? "active" : ""}`}
                  onClick={() => {
                    setLocalScoreMin("85");
                    setLocalScoreMax("");
                  }}
                >
                  85+ (High)
                </button>
                <button
                  type="button"
                  className={`decision-filter-preset-btn ${localScoreMin === "75" && localScoreMax === "" ? "active" : ""}`}
                  onClick={() => {
                    setLocalScoreMin("75");
                    setLocalScoreMax("");
                  }}
                >
                  75+ (Good)
                </button>
                <button
                  type="button"
                  className={`decision-filter-preset-btn ${localScoreMin === "60" && localScoreMax === "" ? "active" : ""}`}
                  onClick={() => {
                    setLocalScoreMin("60");
                    setLocalScoreMax("");
                  }}
                >
                  60+ (Fair)
                </button>
                <button
                  type="button"
                  className={`decision-filter-preset-btn ${localScoreMin === "" && localScoreMax === "60" ? "active" : ""}`}
                  onClick={() => {
                    setLocalScoreMin("");
                    setLocalScoreMax("60");
                  }}
                >
                  &lt; 60 (Low)
                </button>
              </div>
            </div>

            <div className="decision-filter-range-inputs">
              <div className="decision-filter-input-group">
                <label>Min Score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={localScoreMin}
                  onChange={(e) => setLocalScoreMin(e.target.value)}
                />
              </div>
              <span className="decision-filter-range-divider">to</span>
              <div className="decision-filter-input-group">
                <label>Max Score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="100"
                  value={localScoreMax}
                  onChange={(e) => setLocalScoreMax(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. TEXT FILTER (Job Title, Experience, Salary - Case Insensitive contains) */}
        {(column === "jobTitle" || column === "experience" || column === "salary") && (
          <div className="decision-filter-text-content">
            <div className="decision-filter-search-box">
              <Search size={14} className="decision-filter-search-icon" />
              <input
                type="text"
                autoFocus
                placeholder={`Search ${label.toLowerCase()} (case insensitive)...`}
                value={localTextQuery}
                onChange={(e) => setLocalTextQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApply();
                  }
                }}
              />
              {localTextQuery && (
                <button
                  type="button"
                  className="decision-filter-input-clear"
                  onClick={() => setLocalTextQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick list of distinct options to click & fill query */}
            {optionsWithCounts.length > 0 && (
              <div className="decision-filter-quick-options">
                <span className="decision-filter-quick-label">Available values:</span>
                <div className="decision-filter-checklist">
                  {optionsWithCounts.slice(0, 8).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="decision-filter-tag-btn"
                      onClick={() => setLocalTextQuery(opt.value === "—" ? "" : opt.value)}
                    >
                      <span className="decision-filter-tag-text">{opt.value}</span>
                      <span className="decision-filter-tag-count">{opt.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. DATE MULTI-SELECT FILTER (Posted, Analyzed) */}
        {(column === "posted" || column === "analyzed") && (
          <div className="decision-filter-multi-content">
            <div className="decision-filter-search-box">
              <Search size={14} className="decision-filter-search-icon" />
              <input
                type="text"
                placeholder="Search dates..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
              />
            </div>

            <div className="decision-filter-checklist-header">
              {column === "posted" ? (
                <label className="decision-filter-checkbox-label select-all">
                  <input
                    type="checkbox"
                    checked={
                      optionsWithCounts.length > 0 &&
                      localPostedDates.length === optionsWithCounts.length
                    }
                    onChange={() =>
                      handleSelectAll(
                        optionsWithCounts.map((o) => o.value),
                        localPostedDates,
                        setLocalPostedDates
                      )
                    }
                  />
                  <span>(Select All Dates)</span>
                </label>
              ) : (
                <label className="decision-filter-checkbox-label select-all">
                  <input
                    type="checkbox"
                    checked={
                      optionsWithCounts.length > 0 &&
                      localAnalyzedDates.length === optionsWithCounts.length
                    }
                    onChange={() =>
                      handleSelectAll(
                        optionsWithCounts.map((o) => o.value),
                        localAnalyzedDates,
                        setLocalAnalyzedDates
                      )
                    }
                  />
                  <span>(Select All Dates)</span>
                </label>
              )}
            </div>

            <div className="decision-filter-checklist">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked =
                    column === "posted"
                      ? localPostedDates.includes(opt.value)
                      : localAnalyzedDates.includes(opt.value);

                  return (
                    <label key={opt.value} className="decision-filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (column === "posted") {
                            toggleArrayItem(localPostedDates, setLocalPostedDates, opt.value);
                          } else {
                            toggleArrayItem(localAnalyzedDates, setLocalAnalyzedDates, opt.value);
                          }
                        }}
                      />
                      <span className="decision-filter-item-name">{opt.value}</span>
                      <span className="decision-filter-item-count">{opt.count}</span>
                    </label>
                  );
                })
              ) : (
                <div className="decision-filter-no-results">No dates found</div>
              )}
            </div>
          </div>
        )}

        {/* 4. MULTI-OPTION FILTER (Status, Scraper) */}
        {(column === "status" || column === "scraper") && (
          <div className="decision-filter-multi-content">
            {optionsWithCounts.length > 5 && (
              <div className="decision-filter-search-box">
                <Search size={14} className="decision-filter-search-icon" />
                <input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                />
              </div>
            )}

            <div className="decision-filter-checklist-header">
              {column === "status" ? (
                <label className="decision-filter-checkbox-label select-all">
                  <input
                    type="checkbox"
                    checked={
                      optionsWithCounts.length > 0 &&
                      localStatuses.length === optionsWithCounts.length
                    }
                    onChange={() =>
                      handleSelectAll(
                        optionsWithCounts.map((o) => o.value),
                        localStatuses,
                        setLocalStatuses
                      )
                    }
                  />
                  <span>(Select All)</span>
                </label>
              ) : (
                <label className="decision-filter-checkbox-label select-all">
                  <input
                    type="checkbox"
                    checked={
                      optionsWithCounts.length > 0 &&
                      localScrapers.length === optionsWithCounts.length
                    }
                    onChange={() =>
                      handleSelectAll(
                        optionsWithCounts.map((o) => o.value),
                        localScrapers,
                        setLocalScrapers
                      )
                    }
                  />
                  <span>(Select All)</span>
                </label>
              )}
            </div>

            <div className="decision-filter-checklist">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked =
                    column === "status"
                      ? localStatuses.includes(opt.value)
                      : localScrapers.includes(opt.value);

                  return (
                    <label key={opt.value} className="decision-filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (column === "status") {
                            toggleArrayItem(localStatuses, setLocalStatuses, opt.value);
                          } else {
                            toggleArrayItem(localScrapers, setLocalScrapers, opt.value);
                          }
                        }}
                      />
                      <span className="decision-filter-item-name">{opt.value}</span>
                      <span className="decision-filter-item-count">{opt.count}</span>
                    </label>
                  );
                })
              ) : (
                <div className="decision-filter-no-results">No options match</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="decision-filter-footer">
        {isFilterActive && (
          <button
            type="button"
            className="decision-filter-btn-clear"
            onClick={handleClear}
          >
            <RotateCcw size={12} /> Clear
          </button>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
          <button
            type="button"
            className="decision-filter-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="decision-filter-btn-apply"
            onClick={handleApply}
          >
            <Check size={14} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}
