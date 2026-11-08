import { spawn } from "node:child_process";
const mode = process.env.PORTAL_MODE ?? "closed";
if (!["closed", "render-pilot"].includes(mode)) throw new Error("Render only supports closed or restricted pilot mode.");
const port = process.env.PORT ?? "10000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid listener port.");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", port], {
  stdio: "inherit", env: { ...process.env, PORTAL_MODE: mode },
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", () => process.exit(1));
child.on("exit", code => process.exit(code ?? 1));
