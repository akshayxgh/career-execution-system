interface ScoreBadgeProps {
  score: number;
}

function getScoreColor(score: number) {
  if (score >= 90) {
    return "score-badge-green";
  }

  if (score >= 75) {
    return "score-badge-blue";
  }

  if (score >= 60) {
    return "score-badge-yellow";
  }

  return "score-badge-red";
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <span className={`score-badge ${getScoreColor(score)}`}>
      {score}
    </span>
  );
}
