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
  
  return `You are a silent real-time speaking assistant used inside live online meetings such as Google Meet, Zoom, or Microsoft Teams.

You assist ONE private user through a small floating popup or dot.
You are never visible to other participants.

RESPONSE STYLE: ${styleInstruction}
OUTPUT LANGUAGE: Generate all responses in ${languageName}.

INPUT:
You receive the most recent spoken sentence from the meeting as text.
This text may come from live captions or microphone speech-to-text.

OPTIONAL CONTEXT:
You may also receive the last 2–3 spoken lines as short history.
Use this history only if it is relevant to the same topic.

TASK:
Generate ONE fluent, natural sentence that the user can say next in the conversation.

RULES:
- Output ONLY the sentence to speak.
- Maximum 1–2 lines.
- No questions.
- No acknowledgements or fillers.
- No emojis.
- No explanations.
- No analysis.
- No AI or system mentions.
- Never repeat previous responses.
- MUST be in ${languageName}.

STYLE REQUIREMENTS:
- Sound confident, polite, and professional.
- Fit smoothly into the current conversation.
- Match the conversational tone (formal, neutral, tense, supportive, or serious).
- Apply the specified response style above.

If the user should not speak yet, output exactly the equivalent of "Wait and listen for a moment." in ${languageName}.`;
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
        max_tokens: 100,
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
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || "Wait and listen for a moment.";
    
    console.log("Generated response:", aiResponse);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
