export default function AnswerPanel({
  value,
  onChange,
  onSubmit,
  onSkip,
  disabled,
  isSubmitting,
}) {
  return (
    <section className="answer-panel panel">
      <label htmlFor="answer">Your answer</label>
      <textarea
        id="answer"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Think out loud, include examples, and call out trade-offs."
        disabled={disabled}
      />
      <div className="answer-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={onSubmit}
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? "Evaluating..." : "Submit Answer"}
        </button>
        <button
          className="button button-muted"
          type="button"
          onClick={onSkip}
          disabled={disabled || isSubmitting}
        >
          Skip
        </button>
      </div>
    </section>
  );
}
