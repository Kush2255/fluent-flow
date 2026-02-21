import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MicButton from "@/components/MicButton";
import MicrophoneSelector from "@/components/MicrophoneSelector";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { supabase } from "@/integrations/supabase/client";
import { SpeakAssistResponse, DEFAULT_RESPONSE } from "@/types/speakassist";
import {
  Lightbulb, TrendingUp, MessageCircle, CheckCircle2,
  Volume2, Megaphone, Mic, AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AssistantModeProps {
  settings?: {
    responseStyle: string;
    language: string;
  };
}

type AssistantStatus = "idle" | "listening" | "processing" | "analyzing";

const AssistantMode = ({ settings }: AssistantModeProps) => {
  const [aiResponse, setAiResponse] = useState<SpeakAssistResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [confidence, setConfidence] = useState<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef("");
  const hasTriggeredRef = useRef(false);

  const {
    devices, selectedDeviceId, setSelectedDeviceId,
    isPermissionGranted, requestPermission, refreshDevices, micStatus, setMicActive
  } = useAudioDevices();

  const {
    transcript, interimTranscript, isListening,
    isSupported, startListening, stopListening, resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: settings?.language || "en-US",
  });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();
  const { speak, stop: stopTTS, isSpeaking } = useTextToSpeech({ rate: 0.9, enabled: true });

  // Update status based on state
  useEffect(() => {
    if (isProcessing) {
      setStatus("analyzing");
    } else if (isListening) {
      setStatus("listening");
    } else {
      setStatus("idle");
    }
  }, [isListening, isProcessing]);

  // Silence detection: auto-stop after 2s of no new transcript
  useEffect(() => {
    if (!isListening) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const currentText = transcript + interimTranscript;
    if (currentText !== lastTranscriptRef.current) {
      lastTranscriptRef.current = currentText;
    }

    silenceTimerRef.current = setTimeout(() => {
      if (isListening && transcript.trim()) {
        const wordCount = transcript.trim().split(/\s+/).filter(w => w).length;
        if (wordCount < 5) {
          toast({
            title: "⚠️ Too short",
            description: "Please speak at least 5 words.",
            variant: "destructive",
          });
          return;
        }
        stopListening();
        setMicActive(false);
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          generateAISuggestions(transcript.trim());
        }
      }
    }, 2000);

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, interimTranscript, isListening]);

  // Analyze transcript in real-time
  useEffect(() => {
    if (transcript) analyzeText(transcript);
  }, [transcript, analyzeText]);

  const generateAISuggestions = async (text: string) => {
    if (!text) return;
    setIsProcessing(true);
    setStatus("analyzing");
    try {
      const { data, error } = await supabase.functions.invoke("generate-response", {
        body: {
          transcript: text,
          recentHistory: [],
          responseStyle: settings?.responseStyle || "neutral",
          language: settings?.language || "en",
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiResponse(data);
        if (data.confidence_score) setConfidence(data.confidence_score);
      }
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      toast({ title: "Analysis failed", description: "Could not process speech.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = useCallback(async () => {
    if (isListening) {
      stopListening();
      setMicActive(false);
      const wordCount = transcript.trim().split(/\s+/).filter(w => w).length;
      if (wordCount >= 5 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        generateAISuggestions(transcript.trim());
      } else if (wordCount > 0 && wordCount < 5) {
        toast({ title: "⚠️ Too short", description: "Please speak at least 5 words.", variant: "destructive" });
      }
    } else {
      resetTranscript();
      resetAnalysis();
      setAiResponse(null);
      setConfidence(null);
      hasTriggeredRef.current = false;
      lastTranscriptRef.current = "";
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(t => t.stop());
        setMicActive(true);
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
        toast({ title: "Mic access denied", description: "Please allow microphone access.", variant: "destructive" });
      }
    }
  }, [isListening, startListening, stopListening, resetTranscript, resetAnalysis, selectedDeviceId, transcript]);

  const handleReadAloud = useCallback(() => {
    if (isSpeaking) {
      stopTTS();
    } else if (aiResponse?.corrected_sentence) {
      speak(aiResponse.corrected_sentence);
    }
  }, [aiResponse, speak, stopTTS, isSpeaking]);

  const statusConfig: Record<AssistantStatus, { label: string; color: string }> = {
    idle: { label: "Ready", color: "text-muted-foreground" },
    listening: { label: "Listening…", color: "text-primary" },
    processing: { label: "Processing…", color: "text-amber-400" },
    analyzing: { label: "Analyzing Speech…", color: "text-emerald-400" },
  };

  if (!isSupported) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Speech recognition is not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Real-Time Speaking Assistant</h3>
        <p className="text-sm text-muted-foreground">
          Get instant feedback with grammar correction, pronunciation coaching & suggestions
        </p>
      </div>

      {/* Mic Selector */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Microphone</span>
        </div>
        <MicrophoneSelector
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelect={setSelectedDeviceId}
          onRefresh={refreshDevices}
          micStatus={micStatus}
        />
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === "listening" ? "bg-primary animate-pulse" : status === "analyzing" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
        <span className={`text-sm font-medium ${statusConfig[status].color}`}>
          {statusConfig[status].label}
        </span>
        {confidence !== null && (
          <span className="text-xs text-muted-foreground ml-2">
            Confidence: {confidence}%
          </span>
        )}
      </div>

      {/* Mic Button */}
      <div className="flex justify-center py-6">
        <MicButton
          isListening={isListening}
          isProcessing={isProcessing}
          onClick={handleMicClick}
        />
      </div>

      {/* Minimum words hint */}
      {isListening && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-muted-foreground">
          Speak at least 5 words • Auto-stops after 2s silence
        </motion.p>
      )}

      {/* Transcript Panel */}
      <TranscriptPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
        grammarMistakes={analysis.grammarMistakes}
        showHighlights={true}
        onClear={() => {
          resetTranscript();
          resetAnalysis();
          setAiResponse(null);
          setConfidence(null);
          hasTriggeredRef.current = false;
        }}
      />

      {/* Real-time Feedback */}
      {transcript && <SpeakingFeedback analysis={analysis} showDetails={!isListening} />}

      {/* AI Response Cards */}
      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Analysis Header */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{aiResponse.assistive_cue}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  aiResponse.speaking_opportunity === "good" ? "text-emerald-400 bg-emerald-500/20" :
                  aiResponse.speaking_opportunity === "neutral" ? "text-amber-400 bg-amber-500/20" :
                  "text-muted-foreground bg-secondary"
                }`}>
                  {aiResponse.speaking_opportunity === "good" ? "Good time to speak" :
                   aiResponse.speaking_opportunity === "neutral" ? "Neutral moment" : "Keep listening"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Topic:</span>
                  <p className="text-foreground font-medium">{aiResponse.topic}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mood:</span>
                  <p className="text-foreground capitalize">{aiResponse.group_mood}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Intent:</span>
                  <p className="text-foreground capitalize">{aiResponse.intent}</p>
                </div>
              </div>
            </div>

            {/* ✅ Corrected Sentence — Green Card */}
            {aiResponse.corrected_sentence && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Corrected Sentence</span>
                  </div>
                  <button
                    onClick={handleReadAloud}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors text-emerald-400 text-xs font-medium"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse" : ""}`} />
                    {isSpeaking ? "Stop" : "Read Aloud"}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-card/50 border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{aiResponse.corrected_sentence}</p>
                </div>
                {transcript && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">You said:</span>{" "}
                    <span className="line-through opacity-60">{transcript}</span>
                  </div>
                )}
              </div>
            )}

            {/* 📢 How to Say It — Amber Card */}
            {aiResponse.pronunciation_tips && aiResponse.pronunciation_tips.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">How to Say It</span>
                </div>
                <div className="space-y-2">
                  {aiResponse.pronunciation_tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-start gap-2 p-3 rounded-lg bg-card/50 border border-border"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 💬 Suggested Responses — Blue Card */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Suggested Responses</span>
              </div>
              <div className="space-y-2">
                {aiResponse.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-lg bg-card/50 border border-border hover:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm text-foreground">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips when idle */}
      {!transcript && !isListening && !aiResponse && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Quick Tips</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              Select your microphone above, then tap Start Speaking
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              Speak naturally — stops automatically after 2s silence
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              Get corrected sentences, pronunciation tips & conversation suggestions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">4.</span>
              Use "Read Aloud" to hear the correct pronunciation
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AssistantMode;
