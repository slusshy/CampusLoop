import { serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const { publicId } = await request.json();
    if (typeof publicId !== "string" || !/^[\da-f-]{36}$/i.test(publicId)) {
      return jsonResponse({ error: "A valid student ID is required." }, 400);
    }
    const { data: profile, error } = await serviceClient
      .from("profiles")
      .select("display_name, college_id, verification_status, verified_until, colleges(name)")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return jsonResponse({ status: "invalid", valid: false });

    const expired = profile.verification_status === "approved"
      && (!profile.verified_until || new Date(profile.verified_until).getTime() <= Date.now());
    const status = expired ? "expired" : profile.verification_status;
    const valid = status === "approved";
    return jsonResponse({
      status,
      valid,
      ...(valid ? {
        student_name: profile.display_name,
        college: Array.isArray(profile.colleges) ? profile.colleges[0]?.name : profile.colleges?.name,
        valid_until: profile.verified_until,
      } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Student ID verification is temporarily unavailable.";
    return jsonResponse({ error: message }, 400);
  }
});
