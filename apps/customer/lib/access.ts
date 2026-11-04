import { headers } from "next/headers";
import { portalConfig } from "./config";
import { requestAllowed } from "./gate";
export async function localAccess() {
  const config = portalConfig();
  return requestAllowed(await headers(), config);
}
