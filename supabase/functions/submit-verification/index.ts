import { requireUser, serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { collegeId, legalName, enrollmentStatus, documentPath } = body;
    if (typeof collegeId !== "string" || typeof legalName !== "string"
      || !["currently_enrolled", "incoming_student", "recently_graduated"].includes(enrollmentStatus)
      || typeof documentPath !== "string" || !documentPath.startsWith(`${user.id}/`)) {
      return jsonResponse({ error: "Complete every verification field and upload an accepted evidence document." }, 400);
    }

    const { data: profile, error: profileError } = await serviceClient.from("profiles")
      .select("verification_status,verified_until").eq("id", user.id).single();
    if (profileError) throw profileError;
    if (profile.verification_status === "approved" && profile.verified_until
      && Date.parse(profile.verified_until) > Date.now()) {
      return jsonResponse({ error: "Your student status is already verified." }, 409);
    }
    const { data: pending, error: pendingError } = await serviceClient.from("verification_submissions")
      .select("id").eq("user_id", user.id).eq("status", "pending").maybeSingle();
    if (pendingError) throw pendingError;
    if (pending) return jsonResponse({ error: "Your verification is already being reviewed." }, 409);

    const { data: college, error: collegeError } = await serviceClient.from("colleges")
      .select("id").eq("id", collegeId).eq("active", true).maybeSingle();
    if (collegeError) throw collegeError;
    if (!college) return jsonResponse({ error: "Choose an active college from the directory." }, 400);

    const { data: evidence, error: evidenceError } = await serviceClient.storage
      .from("verification-documents").download(documentPath);
    if (evidenceError || !evidence) return jsonResponse({ error: "The uploaded evidence could not be found. Upload it again." }, 400);
    if (evidence.size > 10485760) return jsonResponse({ error: "The verification document exceeds the 10 MB limit." }, 400);

    const { data: submission, error: insertError } = await serviceClient.from("verification_submissions").insert({
      user_id: user.id,
      college_id: collegeId,
      legal_name: legalName.trim(),
      enrollment_status: enrollmentStatus,
      document_path: documentPath,
      status: "pending",
    }).select("id, status, created_at").single();
    if (insertError) throw insertError;

    const { error: updateError } = await serviceClient.from("profiles")
      .update({ college_id: collegeId, verification_status: "pending", verified_until: null })
      .eq("id", user.id);
    if (updateError) {
      await serviceClient.from("verification_submissions").delete().eq("id", submission.id);
      throw updateError;
    }
    return jsonResponse({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification submission failed.";
    const status = message.includes("Authentication") || message.includes("session") ? 401
      : message.includes("authorized") ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});
