import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionCompleteProps {
  show: boolean;
  score: number;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ec4899",
  "#8b5cf6",
];

const SessionComplete = ({ show, score, onClose }: SessionCompleteProps) => {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; delay: number; rotation: number }[]
  >([]);

  useEffect(() => {
    if (!show) return;
    const p = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -40 - 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
    }));
    setParticles(p);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* Confetti */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0, opacity: 1 }}
              animate={{
                y: "110vh",
                rotate: p.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 2.5, delay: p.delay, ease: "easeIn" }}
              className="fixed w-2 h-3 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border shadow-2xl max-w-sm mx-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Trophy className="w-16 h-16 text-amber-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">Session Complete!</h2>
            <p className="text-4xl font-black text-primary">{score}%</p>
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Keep practicing to improve your skills!
            </div>
            <Button onClick={onClose} className="w-full mt-4">
              Continue
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionComplete;
