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
    origin: origin.origin,
    url: backend.origin,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  };
}
