import { NextRequest, NextResponse } from "next/server";
import { backend } from "../../../lib/backend";
import { portalConfig } from "../../../lib/config";
import { credentials, validateDraft } from "../../../lib/draft";
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
    request.headers.get("host") === new URL(config.origin).host &&
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
  if (action !== "draft") return json({ error: "Not found." }, 404);
  try {
    const db = await backend();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user || !user.email_confirmed_at || user.is_anonymous)
      return json({ error: "Sign in with a verified email." }, 401);
    const result = await db
      .from("onboarding_drafts")
      .select("plan, content, updated_at")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error)
      return json(
        { error: "Your draft could not be loaded. Please try again." },
        503,
      );
    return json({
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
  const { action } = await context.params;
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
        if (result.data.session) await db.auth.signOut();
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
      if (
        result.error ||
        !result.data.user?.email_confirmed_at ||
        result.data.user?.is_anonymous
      ) {
        await db.auth.signOut();
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
      return error
        ? json({ error: "Could not sign out. Please retry." }, 503)
        : json({ redirect: "/account?mode=signin" });
    }
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user || !user.email_confirmed_at || user.is_anonymous)
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
    if (action === "draft") {
      let draft;
      try {
        draft = validateDraft(input);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      const { plan, ...content } = draft;
      // Identity is resolved by Auth; never accept owner IDs, billing state or roles from the request.
      const result = await db
        .from("onboarding_drafts")
        .upsert(
          { owner_id: user.id, plan, content },
          { onConflict: "owner_id" },
        );
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
