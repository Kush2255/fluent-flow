import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  neutral: "Use a balanced, professional tone.",
  formal: "Use corporate, polished language. Avoid slang and casual expressions.",
  casual: "Use friendly, conversational style. Be approachable but still helpful.",
  supportive: "Use empathetic, encouraging tone. Be warm and reassuring.",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
};

const buildSystemPrompt = (responseStyle: string, language: string): string => {
  const styleInstruction = STYLE_INSTRUCTIONS[responseStyle] || STYLE_INSTRUCTIONS.neutral;
  const languageName = LANGUAGE_NAMES[language] || "English";
  
  return `You are SpeakAssist, a private, real-time conversational assistant designed to support an introverted user during live group conversations.

Your role is NOT to speak on behalf of the user.
Your role is to analyze the conversation and provide discreet, actionable conversational cues that help the user participate confidently and naturally.

You operate ONLY when the user has explicitly enabled listening.
You must respect privacy:
- Do not store conversations permanently
- Do not reveal analysis to anyone except the user
- Output is private and advisory only

RESPONSE STYLE: ${styleInstruction}
OUTPUT LANGUAGE: Generate all responses in ${languageName}.

INPUT:
You will receive short segments of transcribed group conversation text involving multiple speakers.

TASKS:
For each conversation segment, perform the following analysis:

1. Conversation Understanding
   - Identify the main topic being discussed
   - Identify the dominant conversational intent (e.g., question, concern, suggestion, agreement, explanation)
   - Detect the emotional tone of the group (e.g., supportive, neutral, tense, confused, enthusiastic)

2. Participation Timing
   - Decide whether this is a good moment for the user to speak, a neutral moment, or a better moment to listen
   - Base this on turn-taking, openness of the discussion, and conversational flow

3. Conversational Cue Generation
   - Generate 2–3 short, natural response suggestions the user could say aloud
   - Suggestions must be:
     • Polite
     • Context-aware
     • Non-intrusive
     • Easy to glance and remember
   - Do NOT use long sentences
   - Do NOT force the user to speak
   - Apply the specified response style above

4. Assistive Feedback
   - Provide a brief cue describing the current conversational state (e.g., "Supportive group", "Open discussion", "Clarification expected")

OUTPUT FORMAT (STRICT):
Respond ONLY with valid JSON in this exact structure (no markdown, no explanation):
{
  "topic": "<identified topic>",
  "intent": "<identified intent>",
  "group_mood": "<emotional tone>",
  "speaking_opportunity": "<good | neutral | listen>",
  "assistive_cue": "<short descriptive cue>",
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ]
}

IMPORTANT RULES:
- Never impersonate the user
- Never generate offensive or dominating responses
- Never override user choice
- Focus on confidence-building and inclusion
- If context is unclear, provide safe, neutral suggestions or advise listening
- All text content MUST be in ${languageName}

Your goal is to enable confident, inclusive human–AI collaboration during real-time conversations without disrupting natural interaction.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, recentHistory, responseStyle = "neutral", language = "en" } = await req.json();
    
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 3) {
      return new Response(
        JSON.stringify({ response: "Wait and listen for a moment." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    // Build dynamic system prompt based on settings
    const systemPrompt = buildSystemPrompt(responseStyle, language);

    // Build context message with history if available
    const historyContext = recentHistory && recentHistory.length > 0
      ? `recent_history:\n${recentHistory.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}\n\n`
      : "";
    
    const userMessage = `${historyContext}current_transcript: "${transcript}"`;

    console.log("Processing transcript:", transcript, "| Style:", responseStyle, "| Language:", language);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited");
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("Raw AI response:", aiContent);

    // Parse the JSON response from AI
    try {
      const parsed = JSON.parse(aiContent);
      console.log("Parsed response:", parsed);
      
      return new Response(
        JSON.stringify(parsed),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", parseError, "Content:", aiContent);
      // Fallback response
      return new Response(
        JSON.stringify({
          topic: "unknown",
          intent: "unclear",
          group_mood: "neutral",
          speaking_opportunity: "listen",
          assistive_cue: "Listening mode",
          suggestions: ["Wait and listen for a moment."]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in generate-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
