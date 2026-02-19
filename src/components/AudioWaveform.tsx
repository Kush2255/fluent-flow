import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AudioWaveformProps {
  isActive: boolean;
  deviceId?: string | null;
  barCount?: number;
}

const AudioWaveform = ({ isActive, deviceId, barCount = 24 }: AudioWaveformProps) => {
  const [levels, setLevels] = useState<number[]>(new Array(barCount).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isActive) {
      setLevels(new Array(barCount).fill(0));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (contextRef.current) {
        contextRef.current.close();
        contextRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        const ctx = new AudioContext();
        contextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const newLevels: number[] = [];
          const binSize = Math.floor(dataArray.length / barCount);
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < binSize; j++) {
              sum += dataArray[i * binSize + j] || 0;
            }
            newLevels.push((sum / binSize / 255) * 100);
          }
          setLevels(newLevels);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        console.error("Waveform error:", e);
      }
    };

    start();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (contextRef.current) {
        contextRef.current.close();
      }
    };
  }, [isActive, deviceId, barCount]);

  return (
    <div className="flex items-end gap-[2px] h-8 justify-center">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={{ height: Math.max(2, (level / 100) * 32) }}
          transition={{ duration: 0.05 }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
