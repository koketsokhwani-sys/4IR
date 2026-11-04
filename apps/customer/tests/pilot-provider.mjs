// Test-process preload only. Never imported by application code or start:render.
if (process.env.PORTAL_PILOT_TEST !== "synthetic-local-only") throw new Error("Test-only preload.");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin === "https://qcxtcwvibgizqynkjtja.supabase.co") {
    url.protocol = "http:";
    url.host = "127.0.0.1:55431";
    return originalFetch(new Request(url, request));
  }
  if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return originalFetch(request);
  throw new Error("External network forbidden by pilot test preload.");
};
