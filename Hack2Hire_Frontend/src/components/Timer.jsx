export default function Timer({ secondsRemaining = 120 }) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const state =
    secondsRemaining <= 10 ? "danger" : secondsRemaining <= 30 ? "warning" : "success";

  return (
    <div className={`timer timer-${state}`} aria-live="polite">
      <span className="timer-dot" />
      <span>
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
