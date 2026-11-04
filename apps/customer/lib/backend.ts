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
