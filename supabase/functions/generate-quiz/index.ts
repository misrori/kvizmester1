import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, topic, numQuestions, gradeLevel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Te egy oktatási kvíz generátor AI vagy. A felhasználó megadja a tantárgyat, témakört, évfolyamot és a kérdések számát. Generálj egy kvízt a megadott paraméterek alapján.

FONTOS SZABÁLYOK:
- Minden kérdés legyen egyértelmű és kornak megfelelő
- A helyes válasz mindig pontosan egy legyen multiple-choice esetén
- A válaszlehetőségek legyenek hasonlóak, hogy ne legyen nyilvánvaló a helyes válasz
- Magyar nyelven generálj mindent
- Az id mezőkhöz használj UUID v4 formátumot (pl. "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
- Ha egy kérdéshez jól illeszkedne egy illusztráció (pl. térkép, ábra, természeti jelenség, történelmi esemény), adj meg egy releváns imageUrl-t. Használj publikus, ingyenes képforrásokat (pl. Wikimedia Commons, Unsplash). A kép legyen valódi, elérhető URL.
- NE adj minden kérdéshez képet - csak akkor, ha a kép tényleg segít megérteni a kérdést vagy vizuálisan releváns.
- Ha nem találsz megfelelő képet, hagyd üresen az imageUrl mezőt.`;

    const userPrompt = `Generálj egy kvízt az alábbi paraméterekkel:
- Tantárgy: ${subject}
- Témakör: ${topic}
- Évfolyam: ${gradeLevel || "általános"}
- Kérdések száma: ${numQuestions}

Minden kérdéshez 4 válaszlehetőséget adj meg. Ha releváns, adj hozzá képet is (imageUrl).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_quiz",
              description: "Create a quiz with the given title, description, and questions",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Quiz title in Hungarian" },
                  description: { type: "string", description: "Short quiz description in Hungarian" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique UUID for the question" },
                        type: { type: "string", enum: ["multiple-choice", "text-input"] },
                        text: { type: "string", description: "The question text" },
                        imageUrl: { type: "string", description: "Optional URL to an illustrative image for this question. Only include if truly relevant." },
                        timeLimit: { type: "number", description: "Time limit in seconds (10-30)" },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string", description: "Unique UUID for the option" },
                              text: { type: "string" },
                              isCorrect: { type: "boolean" },
                            },
                            required: ["id", "text", "isCorrect"],
                          },
                        },
                        correctAnswer: { type: "string", description: "For text-input type only" },
                      },
                      required: ["id", "type", "text", "timeLimit", "options"],
                    },
                  },
                },
                required: ["title", "description", "questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_quiz" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Fizetés szükséges, töltsd fel az egyenleged." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI hiba történt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Az AI nem tudott kvízt generálni" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quizData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
