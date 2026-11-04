# Phase 2 foundation — local only, not a launch

The approved scope is customer accounts and package-specific draft onboarding. This branch starts that work in `apps/customer`, a separate Next.js server application. The root application remains the Phase 1 static export, with its existing public design, closed-registration notice and no payment integration. Do not deploy this portal or enable public registration from this PR.

## Architecture decision

Static Cloudflare Pages cannot execute the session-handling and private data endpoints required by this implementation. Keeping the marketing site on Pages and isolating the portal avoids changing its deployment contract. The portal can be built and run as a Node.js application locally. A later approved hosting decision may use a separate Node host or a separately validated Cloudflare Workers adapter; neither is configured here. There is intentionally no portal link on the public website.

The portal renders the shell on the server, then loads private drafts through same-origin Route Handlers. Only those handlers use Supabase, validate identity through `auth.getUser()`, refresh cookie sessions and write cookies. Server Components do not read session cookies or private drafts, so no session-refresh Proxy is needed. This avoids browser token storage, but requires JavaScript for forms and adds an Auth round trip on private requests. Never add protected SSR components without revisiting session refresh.

Supabase is the intended **dedicated 4IR** Auth and PostgreSQL backend. No project was created or connected. Never use the Munchies project, its identifiers, keys, users or buckets. The current configuration accepts only loopback HTTP origins and backend URLs; remote URLs fail closed even if `PORTAL_MODE=local`. The app binds to `127.0.0.1`. This is a development guard, not a substitute for production access control: do not put a tunnel or public reverse proxy in front of the local app.

## Implemented journey

- Registration and sign-in forms; generic email-verification and recovery responses, fixed callback destinations using PKCE code exchange, password update and signout.
- Verified, non-anonymous identity required for draft reads and writes; auto-confirmed signup sessions are discarded, since the backend must require email verification.
- Four existing package names/prices reused from Phase 1. Package choice is a preference, not billing authority or subscription activation.
- One draft per customer containing contact name/number, business name/email, description and website text. Business adds services/page content; Booking adds services, durations, prices and availability; Store adds products and delivery details. Optional content may be completed later. Name and business name are required to save.
- Draft reload/save, pending and failure states, unsaved-change warning, package-change explanation, canonical removal of inapplicable content, and signout. Database-controlled revisions reject stale or duplicate initial saves with HTTP 409. The editor retains unsaved text and requires confirmation before reloading the latest draft. An account-continuity precondition also prevents saving an old tab’s content after another tab signs into a different account.
- Logo/photo uploads deliberately unavailable. No Storage bucket or permissive policies are created. Private upload validation, quotas, malware handling, signed downloads and ownership tests remain future work.

## Security boundaries

All endpoints recheck the closed/local gate. Mutations require exact configured Origin and JSON, and stream reading stops at 32 KiB. Fixed callback destinations prevent open redirects. Private responses use `Cache-Control: private, no-store`. Cookie tokens are HttpOnly and SameSite=Lax; `secure:false` is only for the enforced local HTTP setup. Production would require HTTPS, Secure cookies, reviewed origins and an explicit code change to remove the local-only gate.

Identity comes from Auth, never a submitted owner ID or user-editable metadata. The submitted `expected_account_id` is only compared with the verified identity to detect account switches; it never selects the target row. The API rejects unexpected fields and validates lengths and package-specific data. The candidate SQL also checks shapes, lengths and allowed plans to protect direct Data API access. Row-level policies cover SELECT, INSERT and UPDATE with both ownership checks and a verified, non-anonymous account predicate. `owner_id` is the primary key and foreign key, providing indexed ownership lookups and delete cascade. No customer DELETE permission or privileged workflow/payment columns exist. Column grants restrict writes to business content and plan (and ownership on INSERT only); the database sets revision and timestamp values.

The only SECURITY DEFINER function is a narrow boolean lookup in the non-exposed `private` schema. It has an empty search path, takes no identity argument, checks `auth.uid()`, has PUBLIC/anon execution revoked, and only exposes whether the caller's account is verified. This prevents granting customers access to `auth.users`. No service-role key is used by the app.

Passwords and tokens are not logged or persisted by application code. Verification callbacks recheck the returned user with Auth before accepting the session. A backend that auto-confirms signup is rejected and browser cookies are removed even if provider logout fails. Explicit logout also clears local cookies during provider failure, while reporting that remote revocation is unconfirmed. Auth outages return retryable HTTP 503 and retain unsaved entries and the existing session. The transport test fixture uses deterministic dummy sessions, is only started by Playwright, and is never imported by the application. Do not treat its authentication behavior as a production security test. The protocol fixture now exercises PKCE challenge/verifier matching and code replay, recovery callbacks, SDK refresh-token rotation, provider-rejected sessions, tampered cookies, provider outages and local cookie cleanup. These are application/SDK contract tests, not proof of actual GoTrue, SMTP, signing keys or provider revocation semantics. Real email links, actual expiry/reuse intervals, resend limits and abuse controls still require a dedicated Supabase stack. Access tokens can outlive signout until expiry; do not claim immediate token revocation. No authorization decision uses user metadata.

## Run the reproducible checks

From the repository root, using Node 24:

```sh
npm ci
npm run build
npm run typecheck
npm run check:export
npm ci --prefix apps/customer
npm test --prefix apps/customer
npm run build --prefix apps/customer
npm run typecheck --prefix apps/customer
cd apps/customer
npx playwright install chromium
npm run test:browser
```

For an installed system Chromium, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. Playwright starts the production-built portal twice (local fixture mode and closed mode) plus the loopback transport fixture, and stops them afterwards. Do not run another server on ports 3100, 3101 or 55431 during tests. PGlite executes real PostgreSQL RLS and constraints in-process, with minimal simulated Supabase roles/auth tables. It is not a substitute for the Supabase stack or security advisors.

For later interactive local integration, copy `apps/customer/.env.example` to the ignored `.env.local`; set `PORTAL_MODE=local` only with an authorized dedicated local 4IR backend and its publishable key, email confirmations enabled, and exact callback allowlist. Run `npm run dev --prefix apps/customer`. Never enter real personal information in the fixture. The default remains closed.

## Schema and remaining integration work

`apps/customer/database/foundation.sql` is a tested **candidate schema**, not an applied migration. Supabase CLI 3.0.0 now initializes successfully with its documented `SUPABASE_HOME` override pointing to a writable temporary directory. The attempted isolated local stack could not start: Docker failed to unpack `supabase/postgres:17.11.0.011` with `no space left on device` in its `vfs` layer storage. No database/auth containers started, so migrations, advisors and actual email confirmation remain unverified. Do not apply this directly to a live project. With an authorized local stack, iterate the schema, run Supabase security advisors, generate a versioned migration using the CLI, and verify migration history and reset/reapply before committing the integration.

Before any production release, separately approve and verify:

1. Dedicated 4IR project and runtime hosting; no shared Munchies resources. Apply a reviewed migration and rerun actual RLS/Data API tests as two users and anon.
2. Auth email confirmation, exact callback/recovery URLs and PKCE flow; SMTP delivery, anti-enumeration behavior, rate limits/CAPTCHA, password policy, session expiry/refresh/revocation and outage tests.
3. Privacy notice, retention/deletion/export process, final package inclusions and commercial terms. Current onboarding saves drafts only; it does not submit work for design or activate service.
4. Private uploads and customer profile management, merge/reconciliation UX for conflicting draft edits, account recovery across devices and comprehensive accessibility review. Stale draft overwrites and account switches are now rejected rather than silently accepted.
5. Production HTTPS/cookie/CSP and cache settings, secrets setup without privileged browser keys, launch controls and an explicit approval to open registration. Payments remain a separate phase and are absent.

## Sources checked

- [Supabase SSR client and identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase changelog](https://supabase.com/changelog), including the upcoming [TLS cipher deprecation](https://supabase.com/changelog/cbc-tls-ciphers-deprecated). No relevant client API breaking change was identified; the deprecated TLS ciphers do not affect this loopback test setup.

## Validation recorded 4 November 2026

- Phase 1 production build, TypeScript and seven-page export verification passed; its public source files and package lockfile are unchanged.
- Portal production build and TypeScript passed.
- Five Node tests passed, including PostgreSQL RLS/constraint checks, remote-configuration rejection and input validation.
- Five Chromium tests passed against the application plus transport fixture: closed mode, CSRF/oversize/malformed requests, auth error/verification/recovery states, package-specific draft persistence, two-customer isolation, escaped content, HttpOnly cookies, no-store responses, save-failure retention, package-change clearing, keyboard skip link, password change/signout, and layouts at 375/768/1440px. No page errors occurred in the main onboarding journey. Mobile and desktop screenshots were inspected.
- Full npm audits for both applications reported zero vulnerabilities. `git diff --check` passed.
- These results do not establish real Supabase Auth/email/refresh behavior or production readiness. The integration and launch gaps above remain open.

## Follow-up integration validation

The real Supabase JS/SSR packages are exercised against a stateful loopback protocol fixture, with no cloud resources or real credentials. New checks cover successful and browser-bound PKCE verification/recovery, single-use codes, refresh rotation, rejected/forged sessions, provider outages, signup auto-confirm misconfiguration, local logout during provider failure, stale writes, two-tab conflicts and account switching. The PostgreSQL test additionally verifies revision increments, stale conditional UPDATE returning no rows, and denial of client-written revisions.

No dedicated 4IR backend or credentials are configured in this environment. Local stack testing is owner-authorized. Completing it requires a Docker runtime with sufficient storage, its local publishable configuration, confirmed email/redirect policies and a verified migration. Any hosted project or production rollout still requires separate authorization. Nothing was connected to Munchies. No new credentials, cloud projects, persistent access or deployments were created.

Follow-up results: five Node/domain/PostgreSQL tests and fifteen Chromium API/browser tests passed, along with the portal production build, TypeScript and `git diff --check`. The portal dependency audit reported zero vulnerabilities. No live-system verification is implied by these local results.


## Isolated local stack attempt (2026-11-04)

`apps/customer/supabase/config.toml` defines a separate `4ir-local-integration` stack: API 56321, PostgreSQL 56322, shadow database 56320, local email inbox 56324, and exact portal callbacks on 127.0.0.1:3102. Email confirmations are required; anonymous signup, storage, realtime, Studio, analytics and edge functions are disabled. The CLI 3.0.0 template calls the email capture section `local_smtp`. Do not link this directory to any hosted project. Both existing Munchies projects remain untouched.

For a future attempt with adequate Docker storage, from `apps/customer`:

```sh
export SUPABASE_HOME="$(mktemp -d /tmp/4ir-supabase-home.XXXXXX)"
# Official alternative registry, used where Docker Hub is permitted.
export SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io
npx --yes supabase@3.0.0 telemetry disable
docker network create --driver bridge \
  --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 4ir-local-integration
npx --yes supabase@3.0.0 start --network-id 4ir-local-integration \
  --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

Inspect actual published ports before using the stack; all must be loopback-only. Do not paste `start`/`status` output into logs or PRs: it contains local keys. Never use a service-role key in the portal. Do not enable external SMTP or tunnels. These commands were attempted, but startup did **not** complete in this environment.

Observed: Docker 29.9.2, rootless `vfs`; Auth v2.197.0, PostgREST v16.5, Kong 2.8.1 and Mailpit v1.31.3 downloaded. PostgreSQL 17.11.0.011 layer extraction failed with `no space left on device` under `/home/dockerd/.local/share/docker/vfs/dir/…`. Workspace free space was still 27 GB; that does not establish Docker daemon storage capacity. The CLI retry loop was stopped; the four downloaded images and dedicated network were removed. Docker then reported zero containers, images and volumes. The corrected configuration parses with `supabase services`; successful service startup remains unverified. No cloud resources, account changes, external emails, charges or deployments were requested.

Remaining acceptance checks: successful stack health/port inspection; apply and advise the candidate schema locally; CLI-generated migration and reset/reapply; real captured confirmation/recovery email; actual GoTrue refresh/revocation; two real customers exercising PostgREST ownership isolation; all four package saves and stale-revision conflicts. Existing fixture/PGlite results must not be represented as these checks passing. A preliminary real-service browser test was kept outside the PR because it could not be executed.


### Storage investigation and native fallback

A disposable, network-disabled BusyBox container measured Docker's backing filesystem: 31.5 GiB total, 27.1 GiB available, with approximately 2.04 million free inodes after cleanup. This corrects the earlier assumption that Docker necessarily had a separate smaller disk. The PostgreSQL amd64 manifest has 28 layers (0.31 GiB compressed); compressed download size is not installed disk usage. Docker documents that `vfs` deep-copies each parent layer, making layer amplification the likely cause. The exact peak required capacity was not measured; do not promise that a particular disk size will suffice.

Docker inventory was empty, so there were no abandoned containers, volumes or images to reclaim. Removed only our disposable 621 MiB clean-install copy and the new BusyBox probe image. No other project files or data were deleted. The managed runtime instructions prohibit changing storage drivers or launching a competing daemon; the task runs as UID 1000. No daemon/security configuration was changed.

The documented experimental native runtime was also tried using CLI 3.0.0, `SUPABASE_EXPERIMENTAL_STACK=1`, `--runtime native`, a copied local configuration and a fresh temporary `SUPABASE_HOME`. The platform meets its Linux/glibc requirements. Startup failed before any services ran: `Stack owner failed to start: Unknown: FileSystem.makeDirectory (/home/agent/.supabase)`. The owner process did not honor the writable home override in this attempt. No existing home-directory permissions were changed. No Supabase/PostgreSQL/Auth/Mailpit processes remained; the temporary native project/state were removed.

Supported next environments: an existing development machine with Docker using copy-on-write storage; a separately provisioned development runtime with enough measured Docker space; or a Linux native-runtime environment with a writable default Supabase home (or a CLI release verified to propagate `SUPABASE_HOME` to its owner). None requires a hosted Supabase slot. Do not create paid resources or alter this managed daemon to pursue these options without authorization.

Independent review rechecked fresh Auth identity on private routes, ownership RLS and grants, account/revision preconditions, fixed PKCE destinations, origin/body controls, cookie handling and client-secret exposure. No new exploitable issue was established in this bounded review. `npm audit --omit=dev` reported zero vulnerabilities. This is not a completed production security audit: real-provider isolation/revocation, rate limiting, complete production CSP/HTTPS configuration and the remaining acceptance checks above are still outstanding.

References: [Docker VFS behavior](https://docs.docker.com/engine/storage/drivers/vfs-driver/), [Supabase native runtime](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes), [Supabase home configuration](https://github.com/supabase/cli/blob/develop/apps/cli/docs/supabase-home.md).
