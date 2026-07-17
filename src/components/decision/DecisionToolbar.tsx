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
    <div className="w-full lg:w-[360px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title or company"
          className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-slate-100 shadow-lg shadow-black/10 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
      </label>
    </div>
  );
}
