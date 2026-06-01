import { useCallback } from "react";
import MicButton from "./MicButton.jsx";

export default function AnswerPanel({
  value,
  onChange,
  onSubmit,
  onSkip,
  disabled,
  isSubmitting,
}) {
  const handleTranscript = useCallback(
    (text) => {
      const separator = value.trim() ? " " : "";
      onChange(value + separator + text);
    },
    [value, onChange]
  );

  return (
    <section className="answer-panel panel">
      <label htmlFor="answer">Your answer</label>
      <textarea
        id="answer"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or use the mic to speak your answer..."
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
        <MicButton onTranscript={handleTranscript} disabled={disabled || isSubmitting} />
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
