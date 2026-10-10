import { requireUser, serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    const { dealId } = await request.json();
    if (typeof dealId !== "string") return jsonResponse({ error: "A valid offer is required." }, 400);

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles").select("verification_status, verified_until").eq("id", user.id).single();
    if (profileError) throw profileError;
    if (profile.verification_status !== "approved" || !profile.verified_until || Date.parse(profile.verified_until) <= Date.now()) {
      return jsonResponse({ error: "An active verified student ID is required to redeem an offer." }, 403);
    }

    const { data: deal, error: dealError } = await serviceClient
      .from("deals").select("id, status, starts_at, expires_at, business_id, businesses(active, verified, demo)")
      .eq("id", dealId).single();
    if (dealError) throw dealError;
    const business = Array.isArray(deal.businesses) ? deal.businesses[0] : deal.businesses;
    const now = Date.now();
    if (deal.status !== "active" || Date.parse(deal.starts_at) > now || Date.parse(deal.expires_at) <= now
      || (!business?.demo && (!business?.active || !business?.verified))) {
      return jsonResponse({ error: "This offer is not available for redemption." }, 409);
    }

    const { data: existing, error: existingError } = await serviceClient
      .from("redemptions").select("id").eq("deal_id", dealId).eq("user_id", user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return jsonResponse({ error: "You have already redeemed this offer." }, 409);

    const code = `LOOP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { error: insertError } = await serviceClient.from("redemptions")
      .insert({ deal_id: dealId, user_id: user.id, code_hash: await sha256(code) });
    if (insertError?.code === "23505") return jsonResponse({ error: "You have already redeemed this offer." }, 409);
    if (insertError) throw insertError;
    return jsonResponse({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The offer could not be redeemed.";
    const status = message.includes("Authentication") || message.includes("session") ? 401
      : message.includes("authorized") ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});
