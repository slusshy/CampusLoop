import { requireRole, requireUser, serviceClient } from "../_shared/auth.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const user = await requireUser(request);
    await requireRole(user.id, ["admin"]);
    const body = await request.json();

    if (body.action === "queue") {
      const { data, error } = await serviceClient
        .from("verification_submissions")
        .select("id, user_id, college_id, legal_name, enrollment_status, document_path, created_at, status, review_note, profiles!verification_submissions_user_id_fkey(display_name, verification_status, public_id), colleges(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;

      const submissions = await Promise.all((data ?? []).map(async (submission) => {
        const { data: signed, error: signedError } = await serviceClient.storage
          .from("verification-documents")
          .createSignedUrl(submission.document_path, 120);
        if (signedError) throw signedError;
        return {
          ...submission,
          document_url: signed.signedUrl,
          document_name: submission.document_path.split("/").pop(),
          document_path: undefined,
        };
      }));
      return jsonResponse({ submissions });
    }

    if (body.action === "review") {
      const { submissionId, status, note } = body;
      if (typeof submissionId !== "string" || !["approved", "rejected"].includes(status)) {
        return jsonResponse({ error: "A valid submission ID and approve/reject decision are required." }, 400);
      }
      if (status === "rejected" && (typeof note !== "string" || note.trim().length < 8)) {
        return jsonResponse({ error: "Add a clear review note before rejecting this submission." }, 400);
      }

      const { data: submission, error: loadError } = await serviceClient
        .from("verification_submissions")
        .select("id, user_id, college_id, status")
        .eq("id", submissionId)
        .single();
      if (loadError) throw loadError;
      if (!submission || submission.status !== "pending") {
        return jsonResponse({ error: "This submission is no longer pending review." }, 409);
      }

      const reviewedAt = new Date().toISOString();
      const { data: updatedSubmission, error: submissionError } = await serviceClient.from("verification_submissions")
        .update({ status, review_note: note?.trim() || null, reviewed_by: user.id, reviewed_at: reviewedAt })
        .eq("id", submissionId).eq("status", "pending").select("id").maybeSingle();
      if (submissionError) throw submissionError;
      if (!updatedSubmission) return jsonResponse({ error: "This submission is no longer pending review." }, 409);

      const profileUpdate = status === "approved"
        ? { verification_status: "approved", college_id: submission.college_id, verified_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
        : { verification_status: "rejected", verified_until: null };
      const { error: profileError } = await serviceClient.from("profiles").update(profileUpdate).eq("id", submission.user_id);
      if (profileError) {
        await serviceClient.from("verification_submissions")
          .update({ status: "pending", review_note: null, reviewed_by: null, reviewed_at: null })
          .eq("id", submissionId);
        throw profileError;
      }
      return jsonResponse({ ok: true, status, reviewed_at: reviewedAt });
    }

    return jsonResponse({ error: "Unknown administrator action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The verification review failed.";
    const status = message.includes("Authentication") || message.includes("session") ? 401
      : message.includes("authorized") ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});
