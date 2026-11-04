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
  return result.stdout ?? "";
}
const cli = (...args) => run("npx", ["--yes", "--package=supabase@3.0.0", "supabase", ...args]);
try {
  const driver = run("docker", ["info", "--format", "{{.Driver}}"] ).trim();
  if (driver === "vfs") throw new Error("Refusing vfs: use the standard hosted runner's copy-on-write storage.");
  run("docker", ["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", network]);
  ownsNetwork = true;
  cli("telemetry", "disable");
  started = true;
  cli("start", "--network-id", network, "--exclude", "realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor");
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
  // Fail on security warnings; do not silently suppress an advisor finding.
  cli("db", "advisors", "--type", "security", "--fail-on", "warn");
  cli("db", "pull", "ci_foundation", "--schema", "public,private", "--yes");
  cli("migration", "list");
  cli("db", "reset", "--no-seed", "--yes");
  cli("db", "advisors", "--type", "security", "--fail-on", "warn");
  browser();
  console.log("Real local Supabase lifecycle and ownership checks passed before and after migration replay.");
} finally {
  if (started) run("npx", ["--yes", "--package=supabase@3.0.0", "supabase", "stop", "--project-id", "4ir-local-integration", "--no-backup"], { allowFailure: true });
  if (ownsNetwork) run("docker", ["network", "rm", network], { allowFailure: true });
  rmSync(temp, { recursive: true, force: true });
}
