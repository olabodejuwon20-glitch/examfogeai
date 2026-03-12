import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, verif-hash",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Verify webhook signature
    const secretHash = Deno.env.get("FLW_SECRET_HASH");
    const signature = req.headers.get("verif-hash");

    if (!secretHash || signature !== secretHash) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // 2. Log every webhook
    await supabase.from("webhook_logs").insert({
      provider: "flutterwave",
      event_type: payload.event,
      payload,
      tx_ref: payload.data?.tx_ref || null,
      status: "received",
    });

    // 3. Only process charge.completed
    if (payload.event !== "charge.completed") {
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flwId = payload.data?.id;
    const txRef = payload.data?.tx_ref;

    if (!flwId || !txRef) {
      throw new Error("Missing transaction ID or tx_ref in webhook payload");
    }

    // 4. Check for duplicate processing
    const { data: existingTx } = await supabase
      .from("payment_transactions")
      .select("status")
      .eq("tx_ref", txRef)
      .single();

    if (existingTx?.status === "successful") {
      await supabase
        .from("webhook_logs")
        .update({ status: "duplicate", processed_at: new Date().toISOString() })
        .eq("tx_ref", txRef)
        .eq("status", "received");

      return new Response(
        JSON.stringify({ status: "already_processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify transaction with Flutterwave API
    const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
    if (!flwSecretKey) throw new Error("FLW_SECRET_KEY not configured");

    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${flwId}/verify`,
      {
        headers: { Authorization: `Bearer ${flwSecretKey}` },
      }
    );

    const verifyData = await verifyRes.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful"
    ) {
      // Mark as failed
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("tx_ref", txRef);

      await supabase
        .from("webhook_logs")
        .update({
          status: "verification_failed",
          error: JSON.stringify(verifyData),
          processed_at: new Date().toISOString(),
        })
        .eq("tx_ref", txRef)
        .eq("status", "received");

      return new Response(
        JSON.stringify({ status: "verification_failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Fulfil payment
    const { data: result, error: fulfilError } = await supabase.rpc(
      "fulfil_payment",
      {
        p_tx_ref: txRef,
        p_flw_ref: verifyData.data.flw_ref || "",
        p_flw_tx_id: String(flwId),
        p_amount: verifyData.data.amount,
        p_currency: verifyData.data.currency,
        p_status: "successful",
        p_method: verifyData.data.payment_type || "card",
      }
    );

    if (fulfilError) throw fulfilError;

    // 7. Update webhook log
    await supabase
      .from("webhook_logs")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("tx_ref", txRef)
      .eq("status", "received");

    return new Response(JSON.stringify({ status: "ok", result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);

    // Log error
    await supabase.from("webhook_logs").insert({
      provider: "flutterwave",
      event_type: "error",
      payload: { error: String(err) },
      status: "error",
      error: String(err),
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
