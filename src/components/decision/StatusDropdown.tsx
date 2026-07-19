import {
  decisionStatuses,
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
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange?.(event.target.value as DecisionStatus)
      }
      className="decision-status-select"
    >
      {value === "NEW" && (
        <option value="NEW" disabled hidden>
          NEW
        </option>
      )}

      {options.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}