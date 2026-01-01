import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

type OrbState = "idle" | "listening" | "processing" | "suggesting";

interface FloatingOrbProps {
  suggestion?: string;
  onToggle?: (isActive: boolean) => void;
}

const FloatingOrb = ({ suggestion, onToggle }: FloatingOrbProps) => {
  const [state, setState] = useState<OrbState>("idle");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const isActive = state !== "idle";
  const showSuggestion = state === "suggesting" && suggestion;

  const handleClick = () => {
    if (state === "idle") {
      setState("listening");
      onToggle?.(true);
    } else {
      setState("idle");
      onToggle?.(false);
    }
  };

  // Simulate state transitions for demo
  useEffect(() => {
    if (state === "listening") {
      const timer = setTimeout(() => setState("processing"), 3000);
      return () => clearTimeout(timer);
    }
    if (state === "processing") {
      const timer = setTimeout(() => setState("suggesting"), 1500);
      return () => clearTimeout(timer);
    }
    if (state === "suggesting") {
      const timer = setTimeout(() => setState("listening"), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ x: 20, y: window.innerHeight - 120 }}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
        whileDrag={{ scale: 1.1 }}
      >
        <div className="relative">
          {/* Pulse rings when listening */}
          <AnimatePresence>
            {state === "listening" && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full bg-orb-glow/30"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5,
                  }}
                  className="absolute inset-0 rounded-full bg-orb-glow/20"
                />
              </>
            )}
          </AnimatePresence>

          {/* Processing spinner */}
          <AnimatePresence>
            {state === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                }}
                className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-orb-glow"
              />
            )}
          </AnimatePresence>

          {/* Main orb button */}
          <motion.button
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: isActive ? 1 : 1,
            }}
            className={`
              relative w-16 h-16 rounded-full glass flex items-center justify-center
              transition-all duration-300
              ${isActive ? "orb-glow-intense" : "orb-glow"}
            `}
          >
            <motion.div
              animate={{
                scale: state === "listening" ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: state === "listening" ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              {state === "idle" && <Mic className="w-6 h-6 text-orb-text-muted" />}
              {state === "listening" && <Mic className="w-6 h-6 text-orb-glow" />}
              {state === "processing" && (
                <div className="w-5 h-5 rounded-full border-2 border-orb-glow border-t-transparent animate-spin" />
              )}
              {state === "suggesting" && <Volume2 className="w-6 h-6 text-orb-glow" />}
            </motion.div>
          </motion.button>

          {/* Suggestion bubble */}
          <AnimatePresence>
            {showSuggestion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 0 }}
                animate={{ opacity: 1, scale: 1, x: 10 }}
                exit={{ opacity: 0, scale: 0.8, x: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 max-w-xs"
              >
                <div className="glass rounded-2xl px-4 py-3 orb-glow">
                  <p className="text-sm text-orb-text leading-relaxed">
                    {suggestion}
                  </p>
                </div>
                {/* Arrow pointing to orb */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-orb-surface rotate-45 glass" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* State indicator dot */}
          <motion.div
            animate={{
              backgroundColor:
                state === "idle"
                  ? "hsl(var(--orb-text-muted))"
                  : state === "listening"
                  ? "hsl(var(--orb-glow))"
                  : state === "processing"
                  ? "hsl(var(--orb-glow-secondary))"
                  : "hsl(var(--orb-glow))",
            }}
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-orb-bg"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingOrb;