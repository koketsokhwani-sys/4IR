import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { portalConfig } from "./config";
export async function backend() {
  const config = portalConfig();
  if (!config) throw new Error("Portal closed.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      name: "4ir-auth",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values)
          jar.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
          });
      },
    },
  });
}

// Remove browser access even if the provider is unavailable. This does not claim
// to revoke already-issued tokens or other devices' sessions at the provider.
export async function clearLocalSession() {
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (
      name === "4ir-auth" ||
      /^4ir-auth\.\d+$/.test(name) ||
      name === "4ir-auth-code-verifier"
    ) {
      jar.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 0,
      });
    }
  }
}
