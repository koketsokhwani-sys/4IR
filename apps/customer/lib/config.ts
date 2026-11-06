export function localURL(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
}
export function portalConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.RENDER === "true" && env.PORTAL_MODE === "local") return null;
  if (env.PORTAL_MODE === "render-pilot") {
    const origin = renderOrigin(env.PORTAL_ORIGIN);
    const ids = (env.PORTAL_PILOT_USER_IDS ?? "").split(",");
    if (
      env.PORTAL_PILOT_ENABLED !== "true" || !origin ||
      env.SUPABASE_URL !== "https://qcxtcwvibgizqynkjtja.supabase.co" ||
      !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(env.SUPABASE_PUBLISHABLE_KEY ?? "") ||
      !/^[a-f0-9]{64}$/.test(env.PORTAL_PILOT_ACCESS_SHA256 ?? "") ||
      ids.length > 10 || new Set(ids).size !== ids.length ||
      ids.some(id => !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))
    ) return null;
    return {
      mode: "render-pilot" as const, origin: origin.origin,
      url: env.SUPABASE_URL, key: env.SUPABASE_PUBLISHABLE_KEY!,
      secureCookies: true, accessHash: env.PORTAL_PILOT_ACCESS_SHA256!,
      userIds: ids,
    };
  }
  const origin = localURL(env.PORTAL_ORIGIN);
  const backend = localURL(env.SUPABASE_URL);
  if (
    env.PORTAL_MODE !== "local" ||
    !origin ||
    !backend ||
    !env.SUPABASE_PUBLISHABLE_KEY
  )
    return null;
  return {
    mode: "local" as const,
    secureCookies: false,
    origin: origin.origin,
    url: backend.origin,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  };
}

function renderOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" &&
      (url.hostname === "fourir-customer-pilot.onrender.com" ||
        /^4ir-[a-z0-9]+(?:-[a-z0-9]+)*\.onrender\.com$/.test(url.hostname)) &&
      !url.port && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url : null;
  } catch { return null; }
}
