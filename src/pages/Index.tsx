import { useState, useEffect } from "react";
import FloatingOrb from "@/components/FloatingOrb";

const DEMO_SUGGESTIONS = [
  "That's a great point, and I think we should also consider the timeline.",
  "I agree with your approach, let me add some context.",
  "Wait and listen for a moment.",
  "Could you elaborate on the budget constraints you mentioned?",
  "Based on what you've shared, I'd suggest we prioritize the MVP first.",
];

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Cycle through demo suggestions when active
  useEffect(() => {
    if (isActive) {
      const timer = setInterval(() => {
        setSuggestionIndex((prev) => (prev + 1) % DEMO_SUGGESTIONS.length);
        setCurrentSuggestion(DEMO_SUGGESTIONS[suggestionIndex]);
      }, 5000);
      return () => clearInterval(timer);
    } else {
      setCurrentSuggestion("");
    }
  }, [isActive, suggestionIndex]);

  useEffect(() => {
    if (isActive) {
      setCurrentSuggestion(DEMO_SUGGESTIONS[0]);
    }
  }, [isActive]);

  return (
    <div className="min-h-screen bg-background">
      {/* Demo content to show the overlay works over any content */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight text-foreground">
              Speaking Assistant
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A silent, real-time companion that suggests what to say next in live conversations.
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
                <span>The assistant captures conversation context</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">3.</span>
                <span>A natural response suggestion appears instantly</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orb-glow">4.</span>
                <span>Speak the suggestion or wait for the next one</span>
              </li>
            </ul>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                isActive ? "bg-orb-glow" : "bg-muted-foreground"
              }`} />
              <span className="text-sm font-medium text-foreground">
                Status: {isActive ? "Listening" : "Idle"}
              </span>
            </div>
            
            {currentSuggestion && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Current suggestion:</p>
                <p className="text-foreground">{currentSuggestion}</p>
              </div>
            )}

            {!isActive && (
              <p className="text-sm text-muted-foreground">
                Tap the orb in the bottom-left corner to start.
              </p>
            )}
          </div>

          <div className="text-center pt-8">
            <p className="text-xs text-muted-foreground">
              Drag the orb anywhere on screen. Works as an ambient overlay.
            </p>
          </div>
        </div>
      </div>

      {/* The floating assistant orb */}
      <FloatingOrb
        suggestion={currentSuggestion}
        onToggle={setIsActive}
      />
    </div>
  );
};

export default Index;