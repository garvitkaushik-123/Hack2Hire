export default function ProgressBar({ current = 1, total = 10 }) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="progress-wrap" aria-label={`Question ${current} of ${total}`}>
      <div className="progress-meta">
        <span>Q {current}/{total}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
