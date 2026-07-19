import { Search } from "lucide-react";

interface DecisionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function DecisionToolbar({
  search,
  onSearchChange,
}: DecisionToolbarProps) {
  return (
    <div className="decision-toolbar">
      <label className="decision-search">
        <Search className="decision-search-icon" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, company or source"
        />
      </label>
    </div>
  );
}
