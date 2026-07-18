import { useState } from "react";
import {
  decisionStatuses,
  type DecisionJob,
  type DecisionStatus,
} from "../../services/decisionIntelligenceService";

interface StatusDropdownProps {
  value: DecisionJob["my_status"];
}

export default function StatusDropdown({ value }: StatusDropdownProps) {
  const [status, setStatus] = useState<DecisionStatus>(value);

  return (
    <select
      value={status}
      onChange={(event) => setStatus(event.target.value as DecisionStatus)}
      className="decision-status-select"
    >
      {decisionStatuses.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
