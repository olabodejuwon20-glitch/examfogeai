import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resource_id, content } = await req.json();
    if (!resource_id || !content) {
      return new Response(JSON.stringify({ error: "resource_id and content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: `Categorise this educational resource. Reply with JSON only: {"country": string, "exam": string, "subject": string, "topic": string, "summary": string (max 2 sentences)}. Country should be one of: Nigeria, Ghana, Kenya, South Africa, Uganda, Zimbabwe, Tanzania, or Other. Exam should match the content (WAEC/NECO/JAMB/KCSE/WASSCE etc). If unsure use Other.\n\nContent:\n${content.substring(0, 5000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status, await response.text());
      throw new Error("AI categorisation failed");
    }

    const aiResult = await response.json();
    const text = aiResult.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Update resource_bank row
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("resource_bank").update({
      country: parsed.country || "Other",
      exam: parsed.exam || "Other",
      subject: parsed.subject || "General",
      topic: parsed.topic || "",
      ai_category: parsed.subject || "",
      ai_summary: parsed.summary || "",
    }).eq("id", resource_id);

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorise-resource error:", e);
    return new Response(JSON.stringify({ error: "Categorisation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
