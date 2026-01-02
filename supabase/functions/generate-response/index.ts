import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a silent real-time speaking assistant that runs as a small floating dot overlay during live conversations.

You are not visible to other participants. You do not explain anything.

You receive:
- recent_history: the last 2-3 relevant spoken lines (for context only)
- current_transcript: the most recent spoken sentence

IMPORTANT CONTEXT RULES:
- Use recent_history ONLY to understand context and continuity
- ALWAYS prioritize current_transcript for topic and intent
- If the topic changes, immediately reset context and ignore history
- Never reuse or adapt a previous response

Your task:
- Infer the conversational mood from recent_history and current_transcript (formal, neutral, tense, supportive, serious)
- Adapt the response tone to match the mood
- Generate ONE fluent, natural sentence the user can say next

STRICT OUTPUT RULES:
- Output ONLY the sentence to speak
- Maximum 1-2 lines
- No labels, emojis, or explanations
- No questions
- No acknowledgements or fillers
- No AI or system mentions
- No repetition of previous responses

The sentence must:
- Directly respond to the current topic
- Logically follow the recent_history (if relevant)
- Match the conversational mood
- Sound confident, natural, and professional
- Be ready to speak aloud immediately

If no meaningful response can be given, output exactly: "Wait and listen for a moment."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, recentHistory } = await req.json();
    
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

    // Build context message with history if available
    const historyContext = recentHistory && recentHistory.length > 0
      ? `recent_history:\n${recentHistory.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}\n\n`
      : "";
    
    const userMessage = `${historyContext}current_transcript: "${transcript}"`;

    console.log("Processing transcript:", transcript);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
