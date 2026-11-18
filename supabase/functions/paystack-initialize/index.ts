import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const siteUrl = Deno.env.get("SITE_URL");
  if (!paystackSecret || !supabaseUrl || !serviceRoleKey || !siteUrl) {
    console.error("Required Paystack or Supabase function secrets are missing.");
    return jsonResponse({ error: "Payment service is not configured." }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const amount = Number(payload.amount);
  const frequency = payload.frequency;
  const program = typeof payload.program === "string" ? payload.program.slice(0, 120) : "";
  const message = typeof payload.message === "string" ? payload.message.slice(0, 1000) : "";
  const paymentMethod = payload.payment_method;

  if (!name || name.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 || !Number.isFinite(amount) || amount < 5 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.abs(amount - Math.round(amount * 100) / 100) > 0.000001 ||
      !["one-time", "monthly", "annually"].includes(String(frequency)) ||
      !["momo", "card", "bank"].includes(String(paymentMethod))) {
    return jsonResponse({ error: "Check your details and enter a donation of at least GH₵5." }, 400);
  }

  let callbackUrl: string;
  try {
    const parsedSiteUrl = new URL(siteUrl);
    if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") {
      throw new Error("SITE_URL must use HTTPS.");
    }
    callbackUrl = new URL("donate.html", `${parsedSiteUrl.toString().replace(/\/?$/, "/")}`).toString();
  } catch (error) {
    console.error("SITE_URL is invalid:", error);
    return jsonResponse({ error: "Payment service is not configured correctly." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const reference = `elevate_${crypto.randomUUID().replaceAll("-", "")}`;
  const { data: donation, error: insertError } = await supabase
    .from("donations")
    .insert({
      name,
      email,
      amount: Math.round(amount * 100) / 100,
      currency: "GHS",
      frequency,
      program,
      message,
      payment_method: paymentMethod,
      payment_reference: reference,
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Could not create pending donation:", insertError);
    return jsonResponse({ error: "Unable to start the donation. Please try again." }, 500);
  }

  let paystackResponse: Response;
  try {
    paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: String(Math.round(amount * 100)),
        currency: "GHS",
        reference,
        callback_url: callbackUrl,
        channels: paymentMethod === "momo"
          ? ["mobile_money"]
          : paymentMethod === "card"
          ? ["card"]
          : ["bank", "bank_transfer"],
        metadata: {
          donation_id: donation.id,
          payment_method: paymentMethod,
          frequency,
        },
      }),
    });
  } catch (error) {
    console.error("Paystack initialization request failed:", error);
    await supabase.from("donations").update({ payment_status: "failed" }).eq("id", donation.id);
    return jsonResponse({ error: "Could not connect to Paystack. Please try again." }, 502);
  }

  const result = await paystackResponse.json().catch(() => null);
  if (!paystackResponse.ok || result?.status !== true || !result?.data?.authorization_url) {
    console.error("Paystack rejected transaction initialization:", result?.message || paystackResponse.status);
    await supabase.from("donations").update({ payment_status: "failed" }).eq("id", donation.id);
    return jsonResponse({ error: "Paystack could not start checkout. Please try again." }, 502);
  }

  return jsonResponse({
    authorization_url: result.data.authorization_url,
    reference,
  });
});
