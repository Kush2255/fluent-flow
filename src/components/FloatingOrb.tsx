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

// Simple demo suggestion generator (replace with AI later)
const generateDemoSuggestion = (transcript: string): string => {
  const lowerTranscript = transcript.toLowerCase();
  
  if (lowerTranscript.includes("how are you") || lowerTranscript.includes("how's it going")) {
    return "I'm doing well, thanks for asking. How about yourself?";
  }
  if (lowerTranscript.includes("meeting") || lowerTranscript.includes("schedule")) {
    return "That works for me. Should we also invite the rest of the team?";
  }
  if (lowerTranscript.includes("project") || lowerTranscript.includes("deadline")) {
    return "I think we can meet that deadline if we prioritize the core features first.";
  }
  if (lowerTranscript.includes("question") || lowerTranscript.includes("?")) {
    return "That's a good question. Let me think about that for a moment.";
  }
  if (lowerTranscript.includes("thank")) {
    return "You're welcome. Happy to help anytime.";
  }
  if (lowerTranscript.length > 50) {
    return "I understand your point. What would be the next steps from here?";
  }
  if (lowerTranscript.length > 20) {
    return "That makes sense. Could you tell me more about that?";
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
    
    // Only process if we have new content
    if (
      state === "listening" && 
      trimmedTranscript.length > 10 && 
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