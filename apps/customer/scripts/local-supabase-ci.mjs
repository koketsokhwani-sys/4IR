// Opt-in CI experiment. Uses only a disposable local stack, never a linked project.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REPOSITORY !== "koketsokhwani-sys/4IR") {
  throw new Error("This experiment requires the dedicated 4IR GitHub job.");
}
if (process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY ||
    existsSync("supabase/.temp/project-ref") || existsSync(".supabase/project.json")) {
  throw new Error("Refusing hosted credentials or a linked project.");
}
const temp = mkdtempSync(join(tmpdir(), "4ir-ci-"));
const env = { ...process.env, SUPABASE_HOME: join(temp, "home"), SUPABASE_EXPERIMENTAL_STACK: "0", SUPABASE_INTERNAL_IMAGE_REGISTRY: "docker.io" };
const network = "4ir-local-integration-ci";
let ownsNetwork = false;
let started = false;
let count = 0;
function run(command, args, { privateOutput = true, allowFailure = false, extraEnv = {}, input } = {}) {
  const result = spawnSync(command, args, { env: { ...env, ...extraEnv }, encoding: "utf8", input, maxBuffer: 16 * 1024 * 1024, timeout: 600000 });
  // Logs may contain ephemeral keys. Keep them private and never upload them.
  writeFileSync(join(temp, `step-${++count}.log`), (result.stdout ?? "") + (result.stderr ?? ""), { mode: 0o600 });
  if (!privateOutput) process.stdout.write(result.stdout ?? "");
  if ((result.error || result.status !== 0) && !allowFailure) {
    // Emit bounded failure clues, never successful status/inspection output.
    const clues = ((result.stdout ?? "") + (result.stderr ?? "")).split("\n")
      .filter(line => /error|failed|expected:|received:|timeout|supabase\.local\.ts/i.test(line))
      .filter(line => !/secret|token|password|api.key|anon.key|authorization/i.test(line))
      .slice(-18).join("\n")
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted JWT]")
      .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[redacted key]")
      .replace(/https?:\/\/[^\s"<>]+/g, "[redacted URL]");
    if (clues) console.error(clues);
    throw new Error(`Local integration step ${count} failed (${command} ${args.slice(0,3).join(" ")}); private logs were not uploaded.`);
  }
  return command === "docker" && args[0] === "logs" ? (result.stdout ?? "") + (result.stderr ?? "") : result.stdout ?? "";
}
const cli = (...args) => run("npx", ["--yes", "--package=supabase@3.0.0", "supabase", "--network-id", network, ...args]);
try {
  const driver = run("docker", ["info", "--format", "{{.Driver}}"] ).trim();
  if (driver === "vfs") throw new Error("Refusing vfs: use the standard hosted runner's copy-on-write storage.");
  run("docker", ["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", network]);
  ownsNetwork = true;
  cli("telemetry", "disable");
  started = true;
  cli("start", "--exclude", "realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor");
  const ids = run("docker", ["ps", "-q", "--filter", `network=${network}`]).trim().split(/\s+/).filter(Boolean);
  if (!ids.length) throw new Error("No local stack containers started.");
  const containers = JSON.parse(run("docker", ["inspect", ...ids]));
  for (const container of containers) for (const bindings of Object.values(container.NetworkSettings.Ports ?? {})) {
    for (const binding of bindings ?? []) if (!["127.0.0.1", "::1"].includes(binding.HostIp)) throw new Error("A local stack port was published beyond loopback.");
  }
  const status = JSON.parse(cli("status", "-o", "json"));
  if (status.API_URL !== "http://127.0.0.1:56321" || typeof status.ANON_KEY !== "string" || !status.ANON_KEY) throw new Error("Unexpected local status format or endpoint; refusing to select another backend.");
  const browser = () => run("npx", ["playwright", "test", "--config", "playwright.local.config.ts"], { extraEnv: { SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY } });
  // CLI 3.0.0 query prepares the entire file as one statement. psql handles the
  // multi-statement schema transaction against this exact local container.
  run("docker", ["exec", "-i", "supabase_db_4ir-local-integration", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "--single-transaction"], { input: readFileSync("database/foundation.sql", "utf8") });
  browser();
  console.log("Initial real-auth, ownership and onboarding scenario passed.");
  // Fail on security warnings; do not silently suppress an advisor finding.
  cli("db", "advisors", "--type", "security", "--fail-on", "warn");
  cli("db", "pull", "ci_foundation", "--schema", "public,private", "--yes");
  cli("migration", "list");
  cli("db", "reset", "--no-seed", "--yes");
  const resetDb = JSON.parse(run("docker", ["inspect", "supabase_db_4ir-local-integration"]))[0];
  if (!resetDb.NetworkSettings.Networks[network]) throw new Error("Reset database left the isolated network.");
  for (const bindings of Object.values(resetDb.NetworkSettings.Ports ?? {})) {
    for (const binding of bindings ?? []) if (!["127.0.0.1", "::1"].includes(binding.HostIp)) throw new Error("Reset database published a non-loopback port.");
  }
  // Discard Auth/REST database connections and prepared statements from before
  // reset. Only this disposable stack is restarted; no hosted service is used.
  run("docker", ["restart", "supabase_auth_4ir-local-integration", "supabase_rest_4ir-local-integration"]);
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = JSON.parse(run("docker", ["inspect", "supabase_auth_4ir-local-integration"]));
    if (state[0].State.Health?.Status === "healthy") break;
    if (attempt === 29) throw new Error("Local Auth did not become healthy after reset.");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  cli("db", "advisors", "--type", "security", "--fail-on", "warn");
  browser();
  console.log("Real local Supabase lifecycle and ownership checks passed before and after migration replay.");
} catch (error) {
  if (started) {
    try {
      const state = JSON.parse(run("docker", ["inspect", "supabase_auth_4ir-local-integration"], { allowFailure: true }))[0].State;
      console.error("Local Auth state:", JSON.stringify({ status: state.Status, exitCode: state.ExitCode, health: state.Health?.Status }));
    } catch { console.error("Local Auth state unavailable."); }
    const authLog = run("docker", ["logs", "--tail", "40", "supabase_auth_4ir-local-integration"], { allowFailure: true });
    for (const line of authLog.split("\n")) {
      try {
        const entry = JSON.parse(line);
        if (["error", "fatal", "panic"].includes(entry.level)) {
          const detail = String(entry.error ?? entry.msg ?? "Auth error")
            .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[JWT]")
            .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[synthetic email]");
          if (!/password|token|secret|authorization/i.test(detail)) console.error("Local Auth error:", detail.slice(0, 700));
        }
      } catch { /* Never print unstructured provider output. */ }
    }
  }
  throw error;
} finally {
  if (started) run("npx", ["--yes", "--package=supabase@3.0.0", "supabase", "stop", "--project-id", "4ir-local-integration", "--no-backup"], { allowFailure: true });
  if (ownsNetwork) run("docker", ["network", "rm", network], { allowFailure: true });
  rmSync(temp, { recursive: true, force: true });
}
