import { requireRole, requireUser, serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toUpperCase()));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    await requireRole(user.id, ["admin", "business"]);
    const { code } = await request.json();
    if (typeof code !== "string" || !/^LOOP-[A-Z0-9-]{8,32}$/.test(code.trim().toUpperCase())) {
      return jsonResponse({ error: "Enter a valid CampusLoop redemption code." }, 400);
    }

    const { data: redemption, error } = await serviceClient.from("redemptions")
      .select("id, redeemed_at, validated_at, deals(title, expires_at, businesses(owner_id, name, demo))")
      .eq("code_hash", await sha256(code)).maybeSingle();
    if (error) throw error;
    if (!redemption) return jsonResponse({ status: "invalid", valid: false });

    const deal = Array.isArray(redemption.deals) ? redemption.deals[0] : redemption.deals;
    const business = Array.isArray(deal?.businesses) ? deal.businesses[0] : deal?.businesses;
    if (!business?.demo && business?.owner_id !== user.id && user.app_metadata?.role !== "service_role") {
      await requireRole(user.id, ["admin"]);
    }
    if (business?.demo) return jsonResponse({ status: "demo", valid: false, message: "Demo codes cannot be accepted by a real business." });
    if (redemption.validated_at) return jsonResponse({ status: "already_used", valid: false });
    if (!deal || Date.parse(deal.expires_at) <= Date.now()) return jsonResponse({ status: "expired", valid: false });

    const { data: validated, error: updateError } = await serviceClient.from("redemptions")
      .update({ validated_at: new Date().toISOString(), validated_by: user.id })
      .eq("id", redemption.id).is("validated_at", null).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!validated) return jsonResponse({ status: "already_used", valid: false });
    return jsonResponse({ status: "valid", valid: true, offer: deal.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "This redemption could not be validated.";
    const status = message.includes("Authentication") || message.includes("session") ? 401
      : message.includes("authorized") ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});
