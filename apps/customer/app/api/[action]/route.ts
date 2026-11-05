import { NextRequest, NextResponse } from "next/server";
import { backend, clearLocalSession } from "../../../lib/backend";
import { portalConfig } from "../../../lib/config";
import { credentials, validateDraft } from "../../../lib/draft";
import { projectWorkflowEnabled } from "../../../lib/project-config";
import { missingSubmissionFields } from "../../../lib/project";
import { requestAllowed, pilotUserAllowed } from "../../../lib/gate";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function allowed(request: NextRequest, write: boolean) {
  const config = portalConfig();
  return (
    config &&
    requestAllowed(request.headers, config) &&
    (!write ||
      (request.headers.get("origin") === config.origin &&
        request.headers.get("content-type")?.split(";")[0] ===
          "application/json"))
  );
}
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!allowed(request, false))
    return json({ error: "Registration is closed." }, 403);
  const { action } = await context.params;
  if (action === "project" && !projectWorkflowEnabled()) return json({ error: "Project submissions are closed." }, 403);
  if (action !== "draft" && action !== "project") return json({ error: "Not found." }, 404);
  try {
    const db = await backend();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error && (!error.status || error.status >= 500 || error.status === 429))
      return json(
        {
          error:
            "Account service unavailable. Your entries are unchanged; please retry.",
        },
        503,
      );
    if (error || !user || !user.email_confirmed_at || user.is_anonymous || !pilotUserAllowed(user.id))
      return json({ error: "Sign in with a verified email." }, 401);
    const result = await db
      .from("onboarding_drafts")
      .select("plan, content, updated_at, revision")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error)
      return json(
        { error: "Your draft could not be loaded. Please try again." },
        503,
      );
    if (action === "project") {
      const submissions = await db.from("project_submissions")
        .select("id,draft_revision,plan,content,status,submitted_at")
        .eq("owner_id", user.id).order("draft_revision", { ascending: false }).limit(20);
      if (submissions.error) return json({ error: "Project history could not be loaded. Please retry." }, 503);
      const ids = submissions.data.map(row => row.id);
      const events = ids.length ? await db.from("project_events")
        .select("submission_id,event_number,status,note,created_at")
        .eq("owner_id", user.id).in("submission_id", ids).order("event_number", { ascending: true }) : { data: [], error: null };
      if (events.error) return json({ error: "Project history could not be loaded. Please retry." }, 503);
      const draft = result.data ? { plan: result.data.plan, ...result.data.content } : null;
      return json({ account_id: user.id, revision: result.data?.revision ?? 0, draft,
        missing: draft ? missingSubmissionFields(draft) : ["Save your onboarding draft first"],
        submissions: submissions.data, events: events.data });
    }
    return json({
      revision: result.data?.revision ?? 0,
      account_id: user.id,
      draft: result.data
        ? { plan: result.data.plan, ...result.data.content }
        : null,
    });
  } catch {
    return json(
      { error: "Account service unavailable. Please try again." },
      503,
    );
  }
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!allowed(request, true))
    return json(
      { error: "Registration is closed or request origin is invalid." },
      403,
    );
  const { action } = await context.params;
  // Pilot cannot create accounts, send recovery email or change passwords.
  if (portalConfig()?.mode === "render-pilot" && !["signin", "signout", "draft", "project"].includes(action))
    return json({ error: "This action is unavailable in the restricted pilot." }, 403);
  if (action === "project" && !projectWorkflowEnabled()) return json({ error: "Project submissions are closed." }, 403);
  // Read a bounded stream; Content-Length is not trusted.
  let text = "";
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Request body required." }, 400);
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      return json({ error: "Request too large." }, 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  try {
    const db = await backend();
    if (action === "register" || action === "signin") {
      let account;
      try {
        account = credentials(input);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      if (action === "register") {
        const result = await db.auth.signUp({
          ...account,
          options: {
            emailRedirectTo: portalConfig()!.origin + "/auth/callback",
          },
        });
        // Never accept auto-confirmed signup sessions: verification must be configured.
        if (result.data.session) {
          try {
            await db.auth.signOut();
          } finally {
            await clearLocalSession();
          }
          return json(
            {
              error:
                "Email verification is not configured. Registration remains closed; ask the developer to correct the local Auth settings.",
            },
            503,
          );
        }
        if (result.error && result.error.status && result.error.status >= 500)
          return json(
            { error: "Account service unavailable. Please try again." },
            503,
          );
        return json({
          message:
            "If registration is available for this address, check your email to verify it, then sign in. This local preview does not activate a subscription.",
        });
      }
      const result = await db.auth.signInWithPassword(account);
      if (result.error) {
        // A failed attempt must not invalidate a pending confirmation/recovery
        // challenge. Clear browser authentication, but retain its PKCE verifier.
        await clearLocalSession(true);
        return json({ error: "Unable to sign in. Check your details and verify your email." }, 401);
      }
      if (
        result.error ||
        !result.data.user?.email_confirmed_at ||
        result.data.user?.is_anonymous ||
        !pilotUserAllowed(result.data.user.id)
      ) {
        try { await db.auth.signOut({ scope: "local" }); }
        finally { await clearLocalSession(); }
        return json(
          {
            error:
              "Unable to sign in. Check your details and verify your email.",
          },
          401,
        );
      }
      return json({ redirect: "/onboarding" });
    }
    if (action === "recover") {
      let account;
      try {
        account = credentials(input, false);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      const { error } = await db.auth.resetPasswordForEmail(account.email, {
        redirectTo: portalConfig()!.origin + "/auth/callback?flow=recovery",
      });
      if (error?.status && error.status >= 500)
        return json(
          { error: "Account service unavailable. Please try again." },
          503,
        );
      return json({
        message:
          "If an account exists, check your email for a recovery link. Open it in this browser.",
      });
    }
    if (action === "signout") {
      const { error } = await db.auth.signOut({ scope: "local" });
      await clearLocalSession();
      return error
        ? json(
            {
              error:
                "This browser is signed out, but provider session revocation could not be confirmed. Please retry when the account service returns.",
            },
            503,
          )
        : json({ redirect: "/account?mode=signin" });
    }
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error && (!error.status || error.status >= 500 || error.status === 429))
      return json(
        {
          error:
            "Account service unavailable. Your entries are unchanged; please retry.",
        },
        503,
      );
    if (error || !user || !user.email_confirmed_at || user.is_anonymous || !pilotUserAllowed(user.id))
      return json({ error: "Sign in with a verified email." }, 401);
    if (action === "password") {
      if (
        typeof input.password !== "string" ||
        input.password.length < 12 ||
        input.password.length > 128
      )
        return json(
          { error: "Use a password between 12 and 128 characters." },
          400,
        );
      const { error } = await db.auth.updateUser({ password: input.password });
      if (error)
        return json(
          {
            error:
              "Password could not be updated. Request another recovery link and try again.",
          },
          400,
        );
      const logout = await db.auth.signOut({ scope: "global" });
      await clearLocalSession();
      if (logout.error)
        return json(
          {
            error:
              "Password changed, but session revocation failed. Sign out and retry before continuing.",
          },
          503,
        );
      return json({ redirect: "/account?mode=signin" });
    }
    if (action === "project") {
      if (Object.keys(input).some(key => !["expected_revision", "expected_account_id"].includes(key)) ||
          !Number.isSafeInteger(input.expected_revision) || (input.expected_revision as number) < 1 ||
          (input.expected_revision as number) >= 2147483647)
        return json({ error: "Reload the dashboard before submitting your saved draft." }, 400);
      if (input.expected_account_id !== user.id)
        return json({ error: "Your signed-in account changed. Reload the dashboard before submitting.", conflict: true }, 409);
      // Database trigger locks the saved revision, validates completion and copies the immutable snapshot.
      const result = await db.from("project_submissions").insert({ owner_id: user.id, draft_revision: input.expected_revision })
        .select("id").single();
      if (["40001", "23505"].includes(result.error?.code ?? ""))
        return json({ error: "The draft or review status changed, or this revision was already submitted. Reload the dashboard.", conflict: true }, 409);
      if (result.error?.code === "23514")
        return json({ error: "Complete the submission checklist and save your draft before submitting." }, 400);
      if (result.error) return json({ error: "Submission could not be confirmed. Reload the dashboard before retrying." }, 503);
      return json({ message: "Submitted for review. No payment, subscription or launch has been approved.", id: result.data!.id });
    }
    if (action === "draft") {
      const { expected_revision, expected_account_id, ...values } = input;
      if (
        !Number.isSafeInteger(expected_revision) ||
        (expected_revision as number) < 0 ||
        (expected_revision as number) >= 2147483647
      ) {
        return json({ error: "Reload your draft before saving." }, 400);
      }
      let draft;
      try {
        draft = validateDraft(values);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      // Continuity precondition only: never use the submitted ID to select a row.
      if (expected_account_id !== user.id) {
        return json(
          {
            error:
              "Your signed-in account changed. Your entries remain here. Copy any changes you want to keep, then reload for the current account.",
            conflict: true,
          },
          409,
        );
      }
      const { plan, ...content } = draft;
      // Identity is resolved by Auth; never accept owner IDs, billing state or roles from the request.
      const table = db.from("onboarding_drafts");
      const result =
        expected_revision === 0
          ? await table
              .insert({ owner_id: user.id, plan, content })
              .select("revision")
              .single()
          : await table
              .update({ plan, content })
              .eq("owner_id", user.id)
              .eq("revision", expected_revision)
              .select("revision")
              .maybeSingle();
      if (result.error?.code === "23505" || (!result.error && !result.data)) {
        return json(
          {
            error:
              "A newer draft has been saved in another tab. Your entries are still here. Copy any changes you want to keep, then reload the latest draft.",
            conflict: true,
          },
          409,
        );
      }
      if (result.error)
        return json(
          {
            error:
              "Draft not saved. Your entries remain on screen; please retry.",
          },
          503,
        );
      return json({
        message: "Draft saved. No subscription or payment has been activated.",
        draft,
        revision: result.data!.revision,
      });
    }
    return json({ error: "Not found." }, 404);
  } catch {
    return json(
      { error: "Account service unavailable. Please try again." },
      503,
    );
  }
}
