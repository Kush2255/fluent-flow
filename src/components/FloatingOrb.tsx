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

// Pure stateless response generator - processes ONLY current transcript
const generateResponse = (transcript: string): string => {
  const t = transcript.toLowerCase().replace(/[.,!?'"]/g, "").trim();
  if (!t || t.length < 3) return "Wait and listen for a moment.";

  // Budget/cost/money
  if (/budget|cost|price|expensive|cheap|afford|money|pay/.test(t))
    return "We can cut costs by 20% with a phased rollout over two quarters.";

  // Time/deadline/schedule
  if (/deadline|timeline|when|deliver|eta|by friday|next week|how long|due/.test(t))
    return "Six weeks is realistic, including testing and one revision cycle.";

  // Meeting/calendar
  if (/meet|schedule|call|sync|calendar|book|slot|available|tuesday|monday/.test(t))
    return "Tuesday at 2 PM avoids the sprint planning overlap.";

  // Project/feature/build
  if (/project|feature|build|develop|ship|launch|release|mvp|product/.test(t))
    return "Prioritize authentication, then dashboard, then notifications.";

  // Problem/bug/error
  if (/problem|issue|error|bug|broken|fix|wrong|fail|crash|not working/.test(t))
    return "The root cause is likely the API rate limit—implement request queuing.";

  // Performance/speed
  if (/slow|performance|fast|speed|optim|lag|load|quick|latency/.test(t))
    return "Database indexing on the user ID column cuts query times by 80%.";

  // Design/UI
  if (/design|ui|ux|layout|look|style|visual|interface|color|font/.test(t))
    return "Single-column layout with progressive disclosure keeps it clean.";

  // Team/hiring
  if (/team|resource|hire|staff|people|headcount|capacity|developer|engineer/.test(t))
    return "One senior developer and one designer will hit the Q2 target.";

  // Strategy/planning
  if (/strategy|approach|plan|roadmap|method|how to|way to|next step/.test(t))
    return "Start mobile-first to nail the core use case before expanding.";

  // Data/metrics
  if (/data|analytics|metric|number|track|measure|kpi|report|insight/.test(t))
    return "Track daily active users, session duration, and conversion rate.";

  // Yes/agreement
  if (/^(yes|yeah|ok|okay|sure|right|correct|exactly|agree|sounds good)/.test(t))
    return "Let's move forward with that and circle back if anything changes.";

  // No/disagreement
  if (/^(no|nope|disagree|don't think|not sure|i don't)/.test(t))
    return "We should revisit the requirements before committing to that direction.";

  // Fallback for any input with substance
  if (t.split(/\s+/).length >= 2)
    return "Document the requirements and share with stakeholders by Friday.";

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

  // Process transcript and generate suggestions - ONLY use latest input
  useEffect(() => {
    const trimmedTranscript = transcript.trim();
    
    // Extract only the NEW portion of transcript (ignore history)
    const previousText = lastProcessedTranscript.current;
    const newContent = previousText 
      ? trimmedTranscript.slice(previousText.length).trim()
      : trimmedTranscript;
    
    // Process with lower threshold - infer from partial input
    // Use newContent for topic detection, full transcript only for reference
    if (
      state === "listening" && 
      newContent.length > 5 && 
      trimmedTranscript !== lastProcessedTranscript.current
    ) {
      lastProcessedTranscript.current = trimmedTranscript;
      
      // Clear previous suggestion immediately when new input arrives
      setSuggestion("");
      setState("processing");

      const process = async () => {
        try {
          let newSuggestion: string;
          
          // ALWAYS use only the latest segment, never accumulated history
          const latestInput = newContent || trimmedTranscript;
          
          if (generateSuggestion) {
            newSuggestion = await generateSuggestion(latestInput);
          } else {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 600));
            newSuggestion = generateResponse(latestInput);
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