export default function ScoreCard({ evaluation }) {
  if (!evaluation) return null;

  const rows = [
    ["Accuracy", evaluation.accuracy],
    ["Clarity", evaluation.clarity],
    ["Depth", evaluation.depth],
    ["Relevance", evaluation.relevance],
    ["Time Efficiency", evaluation.time_efficiency],
  ];

  return (
    <aside className="score-card">
      <div className="score-topline">
        <span>Previous answer</span>
        <strong>{evaluation.total}/100</strong>
      </div>
      <div className="score-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}/20</b>
          </div>
        ))}
      </div>
      {evaluation.reasoning && <p>{evaluation.reasoning}</p>}
    </aside>
  );
}
