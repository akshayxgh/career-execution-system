import { useState } from "react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

type DecisionStatus = DecisionJob["my_status"] | "HIDDEN" | "APPLIED";

interface StatusDropdownProps {
  value: DecisionJob["my_status"];
}

const statuses: DecisionStatus[] = ["NEW", "SAVED", "HIDDEN", "APPLIED"];

export default function StatusDropdown({ value }: StatusDropdownProps) {
  const [status, setStatus] = useState<DecisionStatus>(value);

  return (
    <select
      value={status}
      onChange={(event) => setStatus(event.target.value as DecisionStatus)}
      className="decision-status-select"
    >
      {statuses.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
