interface DecisionHeaderProps {
  totalCount: number;
  filteredCount: number;
}

export default function DecisionHeader({
  totalCount,
  filteredCount,
}: DecisionHeaderProps) {
  const isFiltered = filteredCount !== totalCount;

  return (
    <header className="decision-header">
      <h1>Decision Intelligence</h1>
      <p>
        {isFiltered ? (
          <>
            Showing <span className="decision-header-filtered-badge">{filteredCount.toLocaleString()}</span> of{" "}
            {totalCount.toLocaleString()} Recommended Jobs
          </>
        ) : (
          `${totalCount.toLocaleString()} Recommended Jobs`
        )}
      </p>
    </header>
  );
}
