import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type OrbState = "idle" | "listening" | "processing" | "suggesting";

interface FloatingOrbProps {
  onTranscriptChange?: (transcript: string) => void;
  onSuggestion?: (suggestion: string) => void;
  generateSuggestion?: (transcript: string) => Promise<string>;
}

// Demo suggestion generator - infers intent from incomplete/partial speech
// Never asks questions, never uses generic acknowledgments
const generateDemoSuggestion = (transcript: string): string => {
  const lower = transcript.toLowerCase().replace(/[.,!?]/g, '').trim();
  const words = lower.split(/\s+/);
  
  // Infer intent from partial words and fragments
  const hasPartial = (patterns: string[]) => 
    patterns.some(p => lower.includes(p) || words.some(w => w.startsWith(p) || p.startsWith(w)));

  // Budget / cost - catches "budg", "cost", "expen", "price", "money"
  if (hasPartial(["budg", "cost", "expen", "price", "money", "afford", "cheap"])) {
    return "We can reduce costs by 20% if we phase the rollout over two quarters instead of launching everything at once.";
  }
  
  // Timeline / deadline - catches "dead", "time", "when", "by fri", "next week"
  if (hasPartial(["dead", "timeli", "when", "by fri", "next week", "how long", "eta", "deliver"])) {
    return "The realistic timeline is six weeks, accounting for testing and one round of revisions.";
  }
  
  // Meeting / schedule - catches "meet", "sched", "call", "sync", "avail"
  if (hasPartial(["meet", "sched", "call", "sync", "avail", "calendar", "book", "slot"])) {
    return "Tuesday at 2 PM works best since that avoids the sprint planning overlap.";
  }
  
  // Project / feature - catches "proj", "feat", "build", "develop", "ship"
  if (hasPartial(["proj", "feat", "build", "develop", "ship", "launch", "release", "mvp"])) {
    return "The core functionality should be authentication, dashboard, and notifications in that order.";
  }
  
  // Problem / issue - catches "prob", "issue", "error", "bug", "broken", "fix"
  if (hasPartial(["prob", "issue", "error", "bug", "broken", "fix", "wrong", "fail", "crash"])) {
    return "The root cause is likely the API rate limit—we should implement request queuing.";
  }
  
  // Performance - catches "slow", "perf", "fast", "speed", "optim"
  if (hasPartial(["slow", "perf", "fast", "speed", "optim", "lag", "load", "quick"])) {
    return "Adding database indexing on the user ID column will cut query times by about 80%.";
  }
  
  // Design / UI - catches "design", "ui", "ux", "layout", "look", "style"
  if (hasPartial(["design", "ui", "ux", "layout", "look", "style", "visual", "interface"])) {
    return "A single-column layout with progressive disclosure keeps the interface clean while showing all options.";
  }
  
  // Team / resource - catches "team", "resour", "hire", "staff", "people"
  if (hasPartial(["team", "resour", "hire", "staff", "people", "headcount", "capacity"])) {
    return "We need one senior developer and one designer to hit the Q2 target.";
  }
  
  // Strategy / approach - catches "strat", "approach", "plan", "how to", "way to"
  if (hasPartial(["strat", "approach", "plan", "how to", "way to", "method", "roadmap"])) {
    return "Starting with the mobile experience first means we nail the core use case before expanding.";
  }
  
  // Data / analytics - catches "data", "analyt", "metric", "number", "track"
  if (hasPartial(["data", "analyt", "metric", "number", "track", "measure", "kpi", "report"])) {
    return "The key metrics to track are daily active users, session duration, and conversion rate.";
  }

  // Help / assistance - catches "help", "need", "can you", "how do"
  if (hasPartial(["help", "need", "can you", "how do", "assist", "support"])) {
    return "I can walk you through the setup process step by step right now.";
  }

  // Agreement / confirmation context - catches "yeah", "yes", "ok", "sure", "right"
  if (hasPartial(["yeah", "yes", "ok", "sure", "right", "agree", "correct", "exactly"])) {
    return "Great, let's move forward with that approach and circle back if anything changes.";
  }

  // Minimal input but something present - be proactive
  if (words.length >= 2) {
    return "The next step is to document the requirements and share them with stakeholders by Friday.";
  }
  
  return "Wait and listen for a moment.";
};

const FloatingOrb = ({ 
  onTranscriptChange, 
  onSuggestion,
  generateSuggestion 
}: FloatingOrbProps) => {
  const [state, setState] = useState<OrbState>("idle");
  const [suggestion, setSuggestion] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const lastProcessedTranscript = useRef("");

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "en-US",
  });

  const isActive = state !== "idle";
  const showSuggestion = state === "suggesting" && suggestion;
  const currentTranscript = transcript + (interimTranscript ? " " + interimTranscript : "");

  // Notify parent of transcript changes
  useEffect(() => {
    onTranscriptChange?.(currentTranscript);
  }, [currentTranscript, onTranscriptChange]);

  // Process transcript and generate suggestions
  useEffect(() => {
    const trimmedTranscript = transcript.trim();
    
    // Process with lower threshold - infer from partial input
    if (
      state === "listening" && 
      trimmedTranscript.length > 5 && 
      trimmedTranscript !== lastProcessedTranscript.current
    ) {
      lastProcessedTranscript.current = trimmedTranscript;
      setState("processing");

      const process = async () => {
        try {
          let newSuggestion: string;
          
          if (generateSuggestion) {
            newSuggestion = await generateSuggestion(trimmedTranscript);
          } else {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 800));
            newSuggestion = generateDemoSuggestion(trimmedTranscript);
          }

          setSuggestion(newSuggestion);
          onSuggestion?.(newSuggestion);
          setState("suggesting");

          // Return to listening after showing suggestion
          setTimeout(() => {
            if (isListening) {
              setState("listening");
            }
          }, 4000);
        } catch (error) {
          console.error("Error generating suggestion:", error);
          setState("listening");
        }
      };

      process();
    }
  }, [transcript, state, isListening, generateSuggestion, onSuggestion]);

  // Sync state with listening status
  useEffect(() => {
    if (isListening && state === "idle") {
      setState("listening");
    } else if (!isListening && state !== "idle" && state !== "processing" && state !== "suggesting") {
      setState("idle");
    }
  }, [isListening, state]);

  const handleClick = useCallback(async () => {
    if (state === "idle") {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionDenied(false);
        resetTranscript();
        startListening();
        setState("listening");
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setPermissionDenied(true);
      }
    } else {
      stopListening();
      setState("idle");
      setSuggestion("");
      lastProcessedTranscript.current = "";
    }
  }, [state, startListening, stopListening, resetTranscript]);

  if (!isSupported) {
    return (
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-50"
      >
        <motion.div
          initial={{ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 500 }}
          className="absolute pointer-events-auto"
        >
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-foreground">
              Speech recognition not supported in this browser.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 500 }}
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
            className={`
              relative w-16 h-16 rounded-full glass flex items-center justify-center
              transition-all duration-300
              ${isActive ? "orb-glow-intense" : "orb-glow"}
              ${permissionDenied ? "border-destructive/50" : ""}
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
              {state === "idle" && !permissionDenied && (
                <Mic className="w-6 h-6 text-orb-text-muted" />
              )}
              {state === "idle" && permissionDenied && (
                <MicOff className="w-6 h-6 text-destructive" />
              )}
              {state === "listening" && (
                <Mic className="w-6 h-6 text-orb-glow" />
              )}
              {state === "processing" && (
                <div className="w-5 h-5 rounded-full border-2 border-orb-glow border-t-transparent animate-spin" />
              )}
              {state === "suggesting" && (
                <Volume2 className="w-6 h-6 text-orb-glow" />
              )}
            </motion.div>
          </motion.button>

          {/* Permission denied tooltip */}
          <AnimatePresence>
            {permissionDenied && state === "idle" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 max-w-xs"
              >
                <div className="glass rounded-xl px-3 py-2 border border-destructive/30">
                  <p className="text-xs text-destructive">
                    Microphone access denied. Click to retry.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live transcript indicator */}
          <AnimatePresence>
            {state === "listening" && interimTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 max-w-xs"
              >
                <div className="glass rounded-xl px-3 py-2">
                  <p className="text-xs text-orb-text-muted italic truncate max-w-[200px]">
                    {interimTranscript}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-orb-surface rotate-45 glass" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* State indicator dot */}
          <motion.div
            animate={{
              backgroundColor:
                state === "idle"
                  ? permissionDenied
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--orb-text-muted))"
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