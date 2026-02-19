import { useCallback, useRef, useEffect, useState } from "react";

interface TTSOptions {
  rate?: number;
  voiceIndex?: number;
  enabled?: boolean;
}

export const useTextToSpeech = (options: TTSOptions = {}) => {
  const { rate = 1, voiceIndex = 0, enabled = true } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text || !("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      if (voices[voiceIndex]) utterance.voice = voices[voiceIndex];
      utterance.rate = rate;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [enabled, rate, voiceIndex]
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking };
};
