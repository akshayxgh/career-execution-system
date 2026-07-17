interface ScoreBadgeProps {
  score: number;
}

function getScoreColor(score: number) {
  if (score >= 90) {
    return "bg-emerald-500 text-emerald-950";
  }

  if (score >= 75) {
    return "bg-sky-500 text-sky-950";
  }

  if (score >= 60) {
    return "bg-amber-400 text-amber-950";
  }

  return "bg-red-500 text-red-950";
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-lg shadow-black/20 ${getScoreColor(
        score,
      )}`}
    >
      {score}
    </span>
  );
}
