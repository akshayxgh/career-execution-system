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
      className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs font-semibold text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
    >
      {statuses.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
