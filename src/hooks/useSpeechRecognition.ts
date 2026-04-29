import { useState, useEffect, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const { continuous = true, interimResults = true, lang = "en-US" } = options;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize recognition ONCE
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    // @ts-expect-error - non-standard but widely supported
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interim += text;
        }
      }

      if (finalChunk) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalChunk.trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission denied. Please allow mic access.");
        shouldListenRef.current = false;
        setIsListening(false);
      } else if (event.error === "no-speech") {
        // benign — recognition will end and auto-restart
      } else if (event.error === "audio-capture") {
        setError("No microphone detected.");
        shouldListenRef.current = false;
        setIsListening(false);
      } else if (event.error === "network") {
        setError("Network error. Speech recognition needs internet.");
      } else {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      // Auto-restart if user still wants to listen (continuous mode workaround for Chrome)
      if (shouldListenRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current && !isStartingRef.current) {
            try {
              isStartingRef.current = true;
              recognitionRef.current.start();
            } catch (e) {
              isStartingRef.current = false;
              // already started — ignore
            }
          }
        }, 250);
      } else {
        setIsListening(false);
        setInterimTranscript("");
      }
    };

    recognition.onstart = () => {
      isStartingRef.current = false;
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [continuous, interimResults, lang]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (shouldListenRef.current) return; // already listening

    setTranscript("");
    setInterimTranscript("");
    setError(null);
    shouldListenRef.current = true;

    try {
      isStartingRef.current = true;
      recognition.start();
    } catch (e) {
      // InvalidStateError if already started — stop & retry
      isStartingRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionClass {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionClass;
    webkitSpeechRecognition: SpeechRecognitionClass;
  }
}
