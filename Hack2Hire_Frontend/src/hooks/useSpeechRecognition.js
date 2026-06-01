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
      };

      recognition.onend = () => {
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
