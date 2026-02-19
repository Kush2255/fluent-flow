import { useState, useRef, useCallback } from "react";

interface UseMicTestReturn {
  isRecording: boolean;
  isPlaying: boolean;
  startTest: (deviceId?: string | null) => void;
  stopTest: () => void;
}

export const useMicTest = (): UseMicTestReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTest = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRecording(false);
  }, []);

  const startTest = useCallback(
    async (deviceId?: string | null) => {
      try {
        chunksRef.current = [];
        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          setIsPlaying(true);
          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
          };
          audio.play();
        };

        recorder.start();
        setIsRecording(true);

        // Auto-stop after 3 seconds
        timerRef.current = setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
          setIsRecording(false);
        }, 3000);
      } catch (e) {
        console.error("Mic test failed:", e);
        setIsRecording(false);
      }
    },
    []
  );

  return { isRecording, isPlaying, startTest, stopTest };
};
