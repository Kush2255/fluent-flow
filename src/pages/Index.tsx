import { useState, useEffect, useCallback, useRef } from "react";
import FloatingOrb from "@/components/FloatingOrb";
import OrbSettings, { OrbSettingsData } from "@/components/OrbSettings";
import ConversationHistory, { ConversationEntry } from "@/components/ConversationHistory";
import { SpeakAssistResponse } from "@/types/speakassist";

const STORAGE_KEY = "orb-settings";

const defaultSettings: OrbSettingsData = {
  responseStyle: "neutral",
  language: "en",
};

const Index = () => {
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState<SpeakAssistResponse | null>(null);
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
  const handleSuggestion = useCallback((response: SpeakAssistResponse, spokenText?: string) => {
    setLastResponse(response);
    
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
    
    // Add the AI response with the first suggestion as main content
    const mainSuggestion = response.suggestions[0];
    if (mainSuggestion && mainSuggestion !== "Wait and listen for a moment.") {
      newEntries.push({
        id: `ai-${Date.now()}`,
        type: "ai",
        content: mainSuggestion,
        timestamp: now,
      });
    }
    
    if (newEntries.length > 0) {
      setConversationHistory(prev => [...prev, ...newEntries].slice(-20)); // Keep last 20
    }
  }, []);

  const handleClearHistory = useCallback(() => {
    setConversationHistory([]);
    lastAddedTranscript.current = "";
    setLastResponse(null);
    setTranscript("");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight text-foreground">
              SpeakAssist
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your private conversational assistant for confident participation in group discussions.
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
                <span>SpeakAssist analyzes the conversation in real-time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">3.</span>
                <span>Receive context-aware suggestions with timing cues</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">4.</span>
                <span>Choose to speak when the moment feels right</span>
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

          {/* Current Analysis Panel */}
          {lastResponse && (
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orb-glow" />
                  <span className="text-sm font-medium text-foreground">
                    Current Analysis
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-orb-surface text-orb-glow">
                  {lastResponse.assistive_cue}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Topic:</span>
                  <p className="text-foreground">{lastResponse.topic}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mood:</span>
                  <p className="text-foreground capitalize">{lastResponse.group_mood}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Intent:</span>
                  <p className="text-foreground capitalize">{lastResponse.intent}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Speak now?</span>
                  <p className={`capitalize ${
                    lastResponse.speaking_opportunity === "good" 
                      ? "text-green-400" 
                      : lastResponse.speaking_opportunity === "neutral"
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                  }`}>
                    {lastResponse.speaking_opportunity}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Suggestions:</span>
                {lastResponse.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <p className="text-sm text-foreground">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <ConversationHistory entries={conversationHistory} onClear={handleClearHistory} />

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
