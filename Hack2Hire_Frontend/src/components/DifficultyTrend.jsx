export default function DifficultyTrend({ history = [], avgScore = 0 }) {
  return (
    <div className="trend-bar">
      <div>
        <span className="eyebrow">Difficulty path</span>
        <div className="trend-dots">
          {Array.from({ length: 10 }).map((_, index) => {
            const difficulty = history[index];
            return (
              <span
                key={index}
                className={`trend-dot ${difficulty ? `dot-${difficulty}` : ""}`}
                title={difficulty || "Pending"}
              />
            );
          })}
        </div>
      </div>
      <div className="avg-score">
        <span>Running avg</span>
        <strong>{Math.round(avgScore || 0)}%</strong>
      </div>
    </div>
  );
}
