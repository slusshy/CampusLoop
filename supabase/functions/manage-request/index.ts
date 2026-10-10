import { requireUser, serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    const { requestId, action, returnBy } = await request.json();
    if (typeof requestId !== "string" || !["accept", "reject", "complete", "return"].includes(action)) {
      return jsonResponse({ error: "Choose a valid request and action." }, 400);
    }
    const { data, error } = await serviceClient.rpc("transition_item_request", {
      p_request_id: requestId,
      p_actor: user.id,
      p_action: action,
      p_return_by: returnBy || null,
    });
    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The request could not be updated.";
    const status = message.includes("Authentication") || message.includes("session") ? 401
      : message.includes("authorized") ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});
