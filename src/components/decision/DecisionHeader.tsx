interface DecisionHeaderProps {
  count: number;
}

export default function DecisionHeader({ count }: DecisionHeaderProps) {
  return (
    <header className="decision-header">
      <h1>
        Decision Intelligence
      </h1>
      <p>
        {count.toLocaleString()} Recommended Jobs
      </p>
    </header>
  );
}
