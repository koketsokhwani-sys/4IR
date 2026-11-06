import { NextRequest, NextResponse } from "next/server";
import { backend } from "../../../lib/backend";
import { portalConfig } from "../../../lib/config";
export async function GET(request: NextRequest) {
  const config = portalConfig();
  if (!config || config.mode === "render-pilot" || request.headers.get("host") !== new URL(config.origin).host)
    return new NextResponse("Registration is closed.", { status: 403 });
  const code = request.nextUrl.searchParams.get("code");
  const destination =
    request.nextUrl.searchParams.get("flow") === "recovery"
      ? "/account?mode=password"
      : "/onboarding";
  let valid = false;
  if (
    code &&
    code.length < 2048 &&
    request.nextUrl.searchParams.getAll("code").length === 1
  ) {
    try {
      const db = await backend();
      const result = await db.auth.exchangeCodeForSession(code);
      if (!result.error) {
        const {
          data: { user },
          error,
        } = await db.auth.getUser();
        valid = !error && !!user?.email_confirmed_at && !user.is_anonymous;
        if (!valid) await db.auth.signOut({ scope: "local" });
      }
    } catch {
      /* Fixed error redirect; no tokens in logs or responses. */
    }
  }
  return NextResponse.redirect(
    new URL(
      valid ? destination : "/account?mode=signin&notice=expired",
      config.origin,
    ),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
