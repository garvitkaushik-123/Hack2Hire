# Voice Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text-to-speech (listen to questions) and speech-to-text (speak answers) to the TakeOff interview room using the browser's Web Speech API.

**Architecture:** Frontend-only. Two new components (SpeakButton, MicButton), one custom hook (useSpeechRecognition), minor modifications to QuestionPanel, AnswerPanel, and theme.css. Zero backend changes, zero new dependencies.

**Tech Stack:** Web Speech API (`speechSynthesis`, `SpeechRecognition`/`webkitSpeechRecognition`), React hooks

**Spec:** `docs/superpowers/specs/2026-06-01-voice-features-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/hooks/useSpeechRecognition.js` | Create | Custom hook wrapping SpeechRecognition API |
| `src/components/SpeakButton.jsx` | Create | Speaker icon button — reads question text aloud |
| `src/components/MicButton.jsx` | Create | Mic icon button — streams speech-to-text into textarea |
| `src/components/QuestionPanel.jsx` | Modify | Add SpeakButton to question kicker row |
| `src/components/AnswerPanel.jsx` | Modify | Add MicButton to actions row, wire onTranscript |
| `src/styles/theme.css` | Modify | Add voice button styles and recording animation |

---

## Task 1: useSpeechRecognition Hook

**Files:**
- Create: `Hack2Hire_Frontend/src/hooks/useSpeechRecognition.js`

- [ ] **Step 1: Create the hook**

```javascript
// src/hooks/useSpeechRecognition.js
import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function useSpeechRecognition({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const shouldListenRef = useRef(false);

  // Keep callback ref current without restarting recognition
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI || isListening) return;

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          onResultRef.current?.(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldListenRef.current = false;
          setIsListening(false);
        }
        // Ignore 'no-speech' and 'aborted' — they are expected
      };

      recognition.onend = () => {
        // Chrome auto-stops after silence; restart if we still want to listen
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            shouldListenRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    shouldListenRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // already stopped
        }
      }
    };
  }, []);

  return {
    isListening,
    start,
    stop,
    isSupported: Boolean(SpeechRecognitionAPI),
  };
}
```

- [ ] **Step 2: Verify import works**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds (hook isn't used yet, but syntax should be valid).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSpeechRecognition.js
git commit -m "feat: add useSpeechRecognition custom hook for Web Speech API"
```

---

## Task 2: SpeakButton Component

**Files:**
- Create: `Hack2Hire_Frontend/src/components/SpeakButton.jsx`

- [ ] **Step 1: Create SpeakButton.jsx**

```jsx
// src/components/SpeakButton.jsx
import { useCallback, useEffect, useState } from "react";

const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export default function SpeakButton({ text }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleClick = useCallback(() => {
    if (!isSupported || !text) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, text]);

  // Cancel speech when question text changes (new question appeared)
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      className={`voice-btn${isSpeaking ? " is-active is-speaking" : ""}`}
      onClick={handleClick}
      aria-label={isSpeaking ? "Stop reading" : "Read question aloud"}
      title={isSpeaking ? "Stop reading" : "Read question aloud"}
    >
      {isSpeaking ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/SpeakButton.jsx
git commit -m "feat: add SpeakButton component for TTS question playback"
```

---

## Task 3: MicButton Component

**Files:**
- Create: `Hack2Hire_Frontend/src/components/MicButton.jsx`

- [ ] **Step 1: Create MicButton.jsx**

```jsx
// src/components/MicButton.jsx
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
```

- [ ] **Step 2: Verify build**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/MicButton.jsx
git commit -m "feat: add MicButton component for STT answer dictation"
```

---

## Task 4: Wire SpeakButton into QuestionPanel

**Files:**
- Modify: `Hack2Hire_Frontend/src/components/QuestionPanel.jsx`

- [ ] **Step 1: Update QuestionPanel.jsx**

Replace the full file content:

```jsx
// src/components/QuestionPanel.jsx
import DifficultyBadge from "./DifficultyBadge.jsx";
import ScoreCard from "./ScoreCard.jsx";
import SpeakButton from "./SpeakButton.jsx";

export default function QuestionPanel({ question, previousEvaluation }) {
  return (
    <section className="question-panel panel">
      <div className="question-kicker">
        <DifficultyBadge difficulty={question?.difficulty} />
        <span>{question?.category || "technical"}</span>
        <SpeakButton text={question?.question_text} />
      </div>
      <p className="question-body">
        {question?.question_text || "Preparing your first question..."}
      </p>
      <ScoreCard evaluation={previousEvaluation} />
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionPanel.jsx
git commit -m "feat: wire SpeakButton into QuestionPanel for TTS"
```

---

## Task 5: Wire MicButton into AnswerPanel

**Files:**
- Modify: `Hack2Hire_Frontend/src/components/AnswerPanel.jsx`

- [ ] **Step 1: Update AnswerPanel.jsx**

Replace the full file content:

```jsx
// src/components/AnswerPanel.jsx
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
```

- [ ] **Step 2: Verify build**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/AnswerPanel.jsx
git commit -m "feat: wire MicButton into AnswerPanel for STT dictation"
```

---

## Task 6: CSS Styles for Voice Buttons

**Files:**
- Modify: `Hack2Hire_Frontend/src/styles/theme.css`

- [ ] **Step 1: Add voice button styles**

Add the following CSS before the `@media` responsive section at the end of `theme.css`:

```css
/* Voice buttons */
.voice-btn {
  align-items: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: inline-flex;
  height: 2.25rem;
  justify-content: center;
  margin-left: auto;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
  width: 2.25rem;
}

.voice-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  color: var(--color-white);
}

.voice-btn.is-speaking {
  animation: pulse 900ms infinite;
  border-color: var(--color-orange);
  color: var(--color-orange);
}

.button-danger {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.button-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.28);
}

.button-danger.is-active {
  animation: pulse 900ms infinite;
}

.button svg {
  flex-shrink: 0;
}

.button span {
  margin-left: 0.4rem;
}
```

- [ ] **Step 2: Verify build**

```bash
cd Hack2Hire_Frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: add CSS styles for voice TTS/STT buttons"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Start both servers and test**

Start backend:
```bash
cd Hack2Hire_Backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

Start frontend:
```bash
cd Hack2Hire_Frontend && npm run dev
```

- [ ] **Step 2: Test TTS (SpeakButton)**

1. Upload a resume + paste JD → start interview
2. On the interview room, verify the speaker icon appears in the question kicker row (next to difficulty badge)
3. Click the speaker icon → question text should be read aloud
4. Click again while speaking → should stop
5. Answer and move to next question → old speech should auto-cancel
6. Open Firefox/Safari → if speechSynthesis not supported, button should be hidden

- [ ] **Step 3: Test STT (MicButton)**

1. On the interview room, verify "Speak" button appears in the answer actions row
2. Click "Speak" → browser should ask for mic permission → grant it
3. Speak a sentence → text should appear in the textarea
4. Speak more → text should append with a space separator
5. Type additional text manually → should coexist with transcribed text
6. Click "Listening..." button → should stop recording
7. Click Submit → verify the combined typed+spoken text is submitted
8. Let timer expire while recording → should auto-submit with current text

- [ ] **Step 4: Test graceful degradation**

1. Open browser devtools console
2. Run: `delete window.SpeechRecognition; delete window.webkitSpeechRecognition`
3. Refresh page → MicButton should not appear
4. Run: `delete window.speechSynthesis`
5. Refresh page → SpeakButton should not appear
6. Interview should work normally with just typing

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish voice features from E2E testing"
```
