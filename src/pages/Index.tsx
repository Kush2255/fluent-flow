import { useState, useEffect, useCallback, useRef } from "react";
import FloatingOrb from "@/components/FloatingOrb";
import OrbSettings, { OrbSettingsData } from "@/components/OrbSettings";
import ConversationHistory, { ConversationEntry } from "@/components/ConversationHistory";

const STORAGE_KEY = "orb-settings";

const defaultSettings: OrbSettingsData = {
  responseStyle: "neutral",
  language: "en",
};

const Index = () => {
  const [transcript, setTranscript] = useState("");
  const [lastSuggestion, setLastSuggestion] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const lastAddedTranscript = useRef("");
  const [settings, setSettings] = useState<OrbSettingsData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Add transcript to history when it changes significantly
  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript);
    setIsActive(newTranscript.length > 0);
  }, []);

  // Add user speech and AI response to history
  const handleSuggestion = useCallback((suggestion: string, spokenText?: string) => {
    setLastSuggestion(suggestion);
    
    const now = new Date();
    const newEntries: ConversationEntry[] = [];
    
    // Add the spoken text that triggered this suggestion
    if (spokenText && spokenText !== lastAddedTranscript.current) {
      newEntries.push({
        id: `user-${Date.now()}`,
        type: "user",
        content: spokenText,
        timestamp: now,
      });
      lastAddedTranscript.current = spokenText;
    }
    
    // Add the AI suggestion
    if (suggestion && suggestion !== "Wait and listen for a moment.") {
      newEntries.push({
        id: `ai-${Date.now()}`,
        type: "ai",
        content: suggestion,
        timestamp: now,
      });
    }
    
    if (newEntries.length > 0) {
      setConversationHistory(prev => [...prev, ...newEntries].slice(-20)); // Keep last 20
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight text-foreground">
              Speaking Assistant
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tap the orb to start listening. Speak naturally and receive real-time suggestions.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orb-glow animate-breathe" />
              <span className="text-sm font-medium text-foreground">How it works</span>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">1.</span>
                <span>Tap the floating orb to start listening</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">2.</span>
                <span>Speak or let others speak — the assistant captures it live</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">3.</span>
                <span>After detecting speech, a natural response suggestion appears</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">4.</span>
                <span>Speak the suggestion or wait for the next one</span>
              </li>
            </ul>
          </div>

          {/* Live status panel */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                transcript ? "bg-orb-glow" : "bg-muted-foreground"
              }`} />
              <span className="text-sm font-medium text-foreground">
                Live Transcript
              </span>
            </div>
            
            {transcript ? (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border min-h-[80px]">
                <p className="text-foreground leading-relaxed">{transcript}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 min-h-[80px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Transcript will appear here when you start speaking...
                </p>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <ConversationHistory entries={conversationHistory} />

          <div className="text-center pt-8 space-y-2">
            <p className="text-xs text-muted-foreground">
              Drag the orb anywhere on screen. Works as an ambient overlay.
            </p>
            <p className="text-xs text-muted-foreground">
              Best in Chrome, Edge, or Safari for Web Speech API support.
            </p>
          </div>
        </div>
      </div>

      <FloatingOrb
        onTranscriptChange={handleTranscriptChange}
        onSuggestion={handleSuggestion}
        settings={settings}
      />
      
      <OrbSettings settings={settings} onSettingsChange={setSettings} />
    </div>
  );
};

export default Index;