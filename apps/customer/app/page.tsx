import { portalConfig } from "../lib/config";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <main id="main">
      <p className="eyebrow">YOUR BUSINESS. YOUR NEXT STEP.</p>
      <h1>A home for your next chapter.</h1>
      <p>
        This is the separate customer portal foundation. Public registration is
        not open yet.
      </p>
      <a className="button" href="/account">
        {portalConfig()?.mode === "render-pilot" ? "Pilot sign in" : "Local account preview"}
      </a>
    </main>
  );
}
