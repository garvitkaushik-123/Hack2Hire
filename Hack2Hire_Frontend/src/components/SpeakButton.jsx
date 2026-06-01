import { useCallback, useEffect, useRef, useState } from "react";

const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Preferred voices ranked by naturalness — first match wins
const PREFERRED_VOICES = [
  "Google UK English Female",
  "Google UK English Male",
  "Google US English",
  "Samantha",           // macOS high-quality
  "Karen",              // macOS Australian
  "Daniel",             // macOS British
  "Microsoft Zira",     // Windows
  "Microsoft David",    // Windows
];

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Try preferred voices first
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }

  // Fallback: any English voice that isn't the default robotic one
  const english = voices.filter((v) => v.lang.startsWith("en"));
  // Prefer voices with "Google", "Natural", "Enhanced", or "Premium" in the name
  const natural = english.find(
    (v) => /google|natural|enhanced|premium/i.test(v.name)
  );
  if (natural) return natural;

  // Any English voice
  if (english.length) return english[0];

  // Absolute fallback
  return voices[0];
}

export default function SpeakButton({ text }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef(null);

  // Voices load asynchronously in Chrome — listen for the event
  useEffect(() => {
    if (!isSupported) return;

    function loadVoice() {
      voiceRef.current = getBestVoice();
    }

    loadVoice();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoice);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!isSupported || !text) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, text]);

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
