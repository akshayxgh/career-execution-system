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
  // Ensure value is present in options so select never defaults to the first option
  const effectiveOptions = [...options];
  if (value && value !== "NEW" && !effectiveOptions.includes(value)) {
    effectiveOptions.push(value);
  }

  return (
    <select
      value={value}
      onChange={(event) =>
        onChange?.(event.target.value as DecisionStatus)
      }
      className={`decision-status-select decision-status-${(value || "").toLowerCase()}`}
    >
      {value === "NEW" && (
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