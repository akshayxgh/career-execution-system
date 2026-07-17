interface DecisionHeaderProps {
  count: number;
}

export default function DecisionHeader({ count }: DecisionHeaderProps) {
  return (
    <header>
      <h1 className="mb-1 text-3xl font-semibold tracking-tight text-slate-50">
        Decision Intelligence
      </h1>
      <p className="text-sm font-medium text-slate-400">
        {count.toLocaleString()} Recommended Jobs
      </p>
    </header>
  );
}
