import { localAccess } from "../../lib/access";
import { AccountForm } from "./ui";
import { portalConfig } from "../../lib/config";
export const dynamic = "force-dynamic";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await localAccess()))
    return (
      <main id="main">
        <h1>Registration isn’t open just yet.</h1>
        <p>
          Accounts are available only in the explicitly configured local
          development preview.
        </p>
      </main>
    );
  const params = await searchParams;
  const restricted = portalConfig()?.mode === "render-pilot";
  const mode = restricted ? "signin" : ["register", "signin", "recover", "password"].includes(
    String(params.mode),
  )
    ? String(params.mode)
    : "register";
  return (
    <main id="main">
      <p className="eyebrow">{restricted ? "RESTRICTED PILOT · USE TEST DETAILS" : "LOCAL DEVELOPMENT PREVIEW · USE TEST DETAILS"}</p>
      <AccountForm mode={mode} expired={params.notice === "expired"} restricted={restricted} />
    </main>
  );
}
