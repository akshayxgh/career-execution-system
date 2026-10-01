import {
  decisionStatuses,
  formatStatusLabel,
  type DecisionJob,
  type DecisionStatus,
} from "../../services/decisionIntelligenceService";

interface StatusDropdownProps {
  value: DecisionJob["my_status"];
  onChange?: (status: DecisionStatus) => void;
  options?: DecisionStatus[];
}

export default function StatusDropdown({
  value,
  onChange,
  options = decisionStatuses,
}: StatusDropdownProps) {
  // Normalize value
  let normalizedValue = value ? (value.toUpperCase().trim() as DecisionStatus) : value;
  if (normalizedValue === "COMPANY_PORTAL") {
    normalizedValue = "COMPANY_WEBSITE";
  }

  // Ensure value is present in options so select never defaults to the first option
  const effectiveOptions = [...options];
  if (normalizedValue && normalizedValue !== "NEW" && !effectiveOptions.includes(normalizedValue)) {
    effectiveOptions.push(normalizedValue);
  }

  return (
    <select
      value={normalizedValue}
      onChange={(event) =>
        onChange?.(event.target.value as DecisionStatus)
      }
      className={`decision-status-select decision-status-${(normalizedValue || "").toLowerCase()}`}
    >
      {normalizedValue === "NEW" && (
        <option value="NEW" disabled hidden>
          NEW
        </option>
      )}

      {effectiveOptions.map((item) => (
        <option key={item} value={item}>
          {formatStatusLabel(item)}
        </option>
      ))}
    </select>
  );
}