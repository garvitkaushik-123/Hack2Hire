export default function DifficultyBadge({ difficulty = "easy" }) {
  return (
    <span className={`difficulty-badge difficulty-${difficulty.toLowerCase()}`}>
      {difficulty}
    </span>
  );
}
