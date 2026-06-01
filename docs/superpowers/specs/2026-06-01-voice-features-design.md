# Voice Features — Listen to Questions & Speak Answers

## Overview

Add two voice features to the TakeOff interview room using the browser's built-in Web Speech API (zero backend changes, zero dependencies):

1. **Listen to Question (TTS)** — A speaker icon button in the QuestionPanel. Click to hear the question read aloud via `speechSynthesis`.
2. **Speak Your Answer (STT)** — A mic icon button in the AnswerPanel. Click to dictate your answer via `SpeechRecognition`. Transcribed text streams into the existing textarea in real-time.

## Architecture

Frontend-only. No backend changes. No new dependencies.

```
InterviewRoom.jsx (existing)
    ├── QuestionPanel.jsx (modified)
    │     └── SpeakButton.jsx  (NEW — TTS)
    │
    └── AnswerPanel.jsx (modified)
          └── MicButton.jsx    (NEW — STT)
                uses: useSpeechRecognition hook

src/hooks/useSpeechRecognition.js (NEW — custom hook)
```

### New Files

| File | Responsibility |
|---|---|
| `src/hooks/useSpeechRecognition.js` | Custom hook wrapping the SpeechRecognition API |
| `src/components/SpeakButton.jsx` | Speaker icon button for TTS playback |
| `src/components/MicButton.jsx` | Mic icon button for STT recording |

### Modified Files

| File | Change |
|---|---|
| `src/components/QuestionPanel.jsx` | Add SpeakButton next to difficulty badge |
| `src/components/AnswerPanel.jsx` | Add MicButton next to Submit button |
| `src/styles/theme.css` | Add styles for speak/mic buttons and recording state |

---

## SpeakButton (TTS)

### Behavior

- Renders a speaker icon button in the QuestionPanel's `.question-kicker` row (next to difficulty badge and category label)
- **Click to play:** Calls `speechSynthesis.cancel()` (stop any previous), then `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`
- **Click while speaking:** Calls `speechSynthesis.cancel()` to stop
- **Visual states:** Default (speaker icon) → Speaking (animated speaker icon with sound waves)
- **New question appears:** Auto-cancels any ongoing speech via a `useEffect` cleanup
- **Voice config:** `utterance.rate = 1.0`, `utterance.pitch = 1.0`, `utterance.lang = 'en-US'`
- **Graceful degradation:** If `window.speechSynthesis` is undefined, the button is not rendered

### Props

```
SpeakButton({ text })  // text = question string to speak
```

---

## MicButton (STT)

### Behavior

- Renders a mic icon button in the AnswerPanel's `.answer-actions` row (third button after Submit and Skip)
- **Click to start:** Calls `start()` from `useSpeechRecognition` hook
- **While recording:** Button shows red pulsing animation, label changes to "Listening..."
- **Real-time transcription:** As `onresult` fires, the final transcript portions are appended to the parent's `onChange` (the textarea value). Interim results are not written to avoid flicker — only final results are appended.
- **Click to stop:** Calls `stop()`
- **Auto-stop on submit:** When the user clicks Submit, Skip, or when the timer expires, recording stops automatically. The parent (AnswerPanel) calls `stop()` before invoking `onSubmit`/`onSkip`.
- **Auto-stop on question change:** When `InterviewRoom` transitions to the next question, the answer is reset which unmounts/resets the recording state.
- **Graceful degradation:** If `SpeechRecognition` is not supported, the button is not rendered.

### Props

```
MicButton({ onTranscript, disabled })
// onTranscript(text) — called with each final transcript chunk to append to textarea
// disabled — true when submitting or interview ended
```

### Integration with AnswerPanel

The AnswerPanel currently manages `value` and `onChange` from the parent (InterviewRoom). The MicButton calls `onTranscript(text)` which the AnswerPanel converts into an `onChange` call that appends the transcript to the existing value:

```
function handleTranscript(text) {
  const separator = value.trim() ? " " : "";
  onChange(value + separator + text);
}
```

---

## useSpeechRecognition Hook

### Interface

```javascript
const { isListening, start, stop, isSupported } = useSpeechRecognition({ onResult })
```

- `isSupported: boolean` — `true` if `SpeechRecognition` or `webkitSpeechRecognition` exists
- `isListening: boolean` — `true` while recognition is active
- `start()` — begins recognition with `continuous: true`, `interimResults: false`, `lang: 'en-US'`
- `stop()` — stops recognition
- `onResult(transcript: string)` — callback fired with each final transcript string

### Internal Behavior

- Creates a `SpeechRecognition` instance on first `start()` call (lazy init)
- `onresult`: extracts final results, calls `onResult(transcript)`
- `onerror`: if error is `'no-speech'` or `'aborted'`, ignore silently. For `'not-allowed'`, set `isListening = false` (mic permission denied).
- `onend`: if `isListening` is still true (unexpected end), auto-restart. This handles the Chrome behavior where recognition auto-stops after silence.
- Cleanup: stops recognition on unmount via `useEffect` cleanup.

---

## CSS Additions

Add to `theme.css`:

```css
/* Speak/Mic buttons */
.voice-btn { ... }           /* Base: icon-only button, circular, transparent bg */
.voice-btn:hover { ... }     /* Subtle highlight */
.voice-btn.is-active { ... } /* Red pulse for mic recording, orange glow for TTS playing */
```

The buttons use inline SVG icons (no icon library dependency):
- Speaker icon: simple SVG path
- Mic icon: simple SVG path

---

## Edge Cases

- **Browser doesn't support Speech API:** Buttons are hidden. Interview works exactly as before.
- **Mic permission denied:** `onerror` fires with `'not-allowed'`. Stop listening, button returns to default state. No error banner needed (user made a conscious choice to deny).
- **User speaks while timer expires:** Auto-submit triggers, which stops recording first, then submits whatever text is in the textarea (typed + transcribed).
- **User clicks speak while already speaking:** Cancels and restarts from the beginning.
- **Empty speech (silence):** `onresult` never fires with final results. Textarea stays unchanged. No harm.

---

## What We're NOT Building

- No backend speech processing
- No audio recording/storage
- No voice-based navigation
- No multi-language support (English only)
- No voice activity detection UI (waveform visualizer etc.)
