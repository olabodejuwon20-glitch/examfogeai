import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;

async function generateBatch(
  apiKey: string,
  content: string,
  count: number,
  startNumber: number
): Promise<any[]> {
  const prompt = `Generate exactly ${count} multiple-choice questions from this material. Each needs 4 options (A-D), one correct answer, and a brief explanation. Number them starting from ${startNumber}.

Material:
${content.substring(0, 8000)}

Use the suggest_questions tool to respond.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You are an expert exam question generator. Generate diverse, understanding-focused MCQs." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_questions",
            description: "Return generated multiple-choice questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_text: { type: "string" },
                      option_a: { type: "string" },
                      option_b: { type: "string" },
                      option_c: { type: "string" },
                      option_d: { type: "string" },
                      correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
                      explanation: { type: "string" },
                    },
                    required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_questions" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text();
    console.error(`AI gateway error (batch starting ${startNumber}):`, status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error("AI generation failed");
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.questions;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { testId, content, numQuestions } = await req.json();

    // Use service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authorization: verify testId belongs to this user ---
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, user_id")
      .eq("id", testId)
      .single();

    if (testError || !test || test.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: test does not belong to you" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Split into parallel batches for faster generation
    const batches: { count: number; startNumber: number }[] = [];
    let remaining = numQuestions;
    let startNum = 1;
    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      batches.push({ count: batchCount, startNumber: startNum });
      startNum += batchCount;
      remaining -= batchCount;
    }

    // Run batches in parallel (max 3 concurrent)
    const allQuestions: any[] = [];
    for (let i = 0; i < batches.length; i += 3) {
      const chunk = batches.slice(i, i + 3);
      const results = await Promise.all(
        chunk.map((b) => generateBatch(LOVABLE_API_KEY, content, b.count, b.startNumber))
      );
      for (const qs of results) {
        allQuestions.push(...qs);
      }
    }

    // Re-number sequentially and insert
    const questionsToInsert = allQuestions.map((q: any, index: number) => ({
      test_id: testId,
      question_number: index + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

    const { error: insertError } = await supabase.from("questions").insert(questionsToInsert);
    if (insertError) throw insertError;

    await supabase.from("tests").update({ status: "ready" }).eq("id", testId);

    return new Response(JSON.stringify({ success: true, count: questionsToInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("generate-questions error:", e);

    if (message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
