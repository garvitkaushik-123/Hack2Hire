export default function ReadinessGauge({ score = 0, label = "Pending" }) {
  const normalized = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="gauge">
      <svg viewBox="0 0 128 128" role="img" aria-label={`Readiness score ${normalized}`}>
        <circle className="gauge-track" cx="64" cy="64" r="54" />
        <circle
          className="gauge-fill"
          cx="64"
          cy="64"
          r="54"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <strong>{normalized}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
