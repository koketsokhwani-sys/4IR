import { headers } from "next/headers";
import { portalConfig } from "./config";
export async function localAccess() {
  const config = portalConfig();
  return (
    !!config && (await headers()).get("host") === new URL(config.origin).host
  );
}
