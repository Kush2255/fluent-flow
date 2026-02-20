export interface SpeakAssistResponse {
  topic: string;
  intent: string;
  group_mood: string;
  speaking_opportunity: "good" | "neutral" | "listen";
  assistive_cue: string;
  suggestions: string[];
  corrected_sentence?: string;
  pronunciation_tips?: string[];
}

export const DEFAULT_RESPONSE: SpeakAssistResponse = {
  topic: "unknown",
  intent: "unclear",
  group_mood: "neutral",
  speaking_opportunity: "listen",
  assistive_cue: "Listening mode",
  suggestions: ["Wait and listen for a moment."],
  corrected_sentence: "",
  pronunciation_tips: [],
};
