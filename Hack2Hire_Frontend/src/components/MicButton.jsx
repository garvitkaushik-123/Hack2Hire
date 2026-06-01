import useSpeechRecognition from "../hooks/useSpeechRecognition.js";

export default function MicButton({ onTranscript, disabled }) {
  const { isListening, start, stop, isSupported } = useSpeechRecognition({
    onResult: onTranscript,
  });

  if (!isSupported) return null;

  function handleClick() {
    if (disabled) return;
    if (isListening) {
      stop();
    } else {
      start();
    }
  }

  return (
    <button
      type="button"
      className={`button ${isListening ? "button-danger is-active" : "button-muted"}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isListening ? "Stop recording" : "Speak your answer"}
      title={isListening ? "Stop recording" : "Speak your answer"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="1" width="6" height="12" rx="3" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      <span>{isListening ? "Listening..." : "Speak"}</span>
    </button>
  );
}
