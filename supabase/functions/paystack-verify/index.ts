import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!paystackSecret || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Required Paystack or Supabase function secrets are missing.",
    );
    return jsonResponse({ error: "Payment service is not configured." }, 500);
  }

  let reference: unknown;
  try {
    reference = (await request.json()).reference;
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  if (
    typeof reference !== "string" ||
    !/^elevate_[a-f0-9]{32}$/.test(reference)
  ) {
    return jsonResponse({ error: "Invalid payment reference." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: donation, error: lookupError } = await supabase
    .from("donations")
    .select("id, amount, currency, payment_status")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (lookupError) {
    console.error("Could not load donation for verification:", lookupError);
    return jsonResponse({ error: "Unable to verify this payment." }, 500);
  }
  if (!donation) {
    return jsonResponse({ error: "Payment reference was not found." }, 404);
  }

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );
  } catch (error) {
    console.error("Paystack verification request failed:", error);
    return jsonResponse(
      { error: "Could not connect to Paystack to verify payment." },
      502,
    );
  }

  const result = await verifyResponse.json().catch(() => null);
  const transaction = result?.data;
  const paymentVerified =
    verifyResponse.ok &&
    result?.status === true &&
    transaction?.status === "success" &&
    transaction?.reference === reference &&
    transaction?.currency === donation.currency &&
    Number(transaction?.amount) === Math.round(Number(donation.amount) * 100);

  if (!paymentVerified) {
    return jsonResponse({
      paid: false,
      message:
        "Payment has not been confirmed. If you completed checkout, try again shortly.",
    });
  }

  if (donation.payment_status !== "paid") {
    const { error: updateError } = await supabase
      .from("donations")
      .update({ payment_status: "paid" })
      .eq("id", donation.id);
    if (updateError) {
      console.error("Could not mark verified donation as paid:", updateError);
      return jsonResponse(
        {
          error:
            "Payment was received but could not be recorded. Contact support.",
        },
        500,
      );
    }
  }

  return jsonResponse({
    paid: true,
    message: "Payment confirmed. Thank you for your donation!",
  });
});
