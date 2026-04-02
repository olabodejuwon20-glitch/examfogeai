import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find wallets with expired reward credits
    const { data: expired, error: fetchErr } = await supabase
      .from("credits_wallet")
      .select("user_id, reward_balance")
      .lt("reward_expires_at", new Date().toISOString())
      .gt("reward_balance", 0);

    if (fetchErr) throw fetchErr;
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const wallet of expired) {
      // Zero out reward balance and deduct from main balance
      await supabase.from("credits_wallet").update({
        balance: supabase.rpc ? undefined : undefined, // handled below
        reward_balance: 0,
        reward_expires_at: null,
      }).eq("user_id", wallet.user_id);

      // Deduct reward_balance from balance
      const { data: current } = await supabase
        .from("credits_wallet")
        .select("balance")
        .eq("user_id", wallet.user_id)
        .single();

      if (current) {
        const newBalance = Math.max(0, current.balance - wallet.reward_balance);
        await supabase.from("credits_wallet").update({
          balance: newBalance,
          reward_balance: 0,
          reward_expires_at: null,
        }).eq("user_id", wallet.user_id);
      }

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: wallet.user_id,
        amount: -wallet.reward_balance,
        type: "expired",
        description: "Reward credits expired",
      });

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expire-rewards error:", e);
    return new Response(JSON.stringify({ error: "Failed to expire rewards" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
