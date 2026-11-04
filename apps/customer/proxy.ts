import { NextRequest, NextResponse } from "next/server";
import { portalConfig } from "./lib/config";
import { requestAllowed } from "./lib/gate";

export function proxy(request: NextRequest) {
  // A static liveness response does not contact Auth, expose config or open access.
  if (request.nextUrl.pathname === "/healthz") return NextResponse.next();
  if (process.env.PORTAL_MODE !== "render-pilot") return NextResponse.next();
  const config = portalConfig();
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!config) return new NextResponse("Pilot unavailable.", { status: 503, headers });
  if (request.headers.get("host") !== new URL(config.origin).host)
    return new NextResponse("Access denied.", { status: 403, headers });
  if (!requestAllowed(request.headers, config))
    return new NextResponse("Restricted pilot.", { status: 401, headers: { ...headers, "WWW-Authenticate": 'Basic realm="4IR restricted pilot", charset="UTF-8"' } });
  return NextResponse.next();
}

export const config = { matcher: ["/:path*"] };
