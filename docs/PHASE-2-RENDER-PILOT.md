# Restricted Render pilot: prepared, not deployed

The owner approved preparing a Render Free pilot. This document and draft code do **not** authorize service creation, deployment, credentials, account provisioning, external email, signup opening, paid plans, GitHub grants or merging. The live Phase 1 site and both Munchies projects stay separate and unchanged.

## Prepared implementation

`deploy/render-pilot.yaml` describes one Node web service on `plan: free`, with `apps/customer` as its root. Build: `npm ci && npm run build`; start: `npm run start:render`. Node 24.22.1 is pinned. The listener uses `0.0.0.0` and Render's `PORT` (default 10000); the ordinary local start command still binds loopback. The Render launcher rejects local development mode. No Render database, disk, background job, cron, email service, custom domain or preview environment is requested. Automatic deploys are off. Creating/syncing the Blueprint still starts its **initial deployment** and requires later approval.

The proposed region is Frankfurt, near the dedicated London Supabase backend; the owner must confirm this choice and service name before creation. Render cannot change a service's region in place. The proposed name may receive a suffix if unavailable, so the eventual exact `onrender.com` hostname must be verified rather than guessed.

Defaults: `PORTAL_MODE=closed`, `PORTAL_PILOT_ENABLED=false`, and no provider key or access material. `/healthz` is a public static 204 liveness response with no provider call or configuration disclosure; it does not establish that pilot configuration or the database is ready. A closed deployment may therefore be healthy while customer access remains unavailable.

## Access boundaries

Render Free **web services have public URLs**. This is an application-restricted pilot, not a private-network service. In `render-pilot` mode, Next.js Proxy challenges every page, asset and API except `/healthz` with HTTP Basic authentication; routes independently recheck Host and access credentials. Invalid/missing pilot configuration fails closed. The username is `4ir-pilot`; the owner must later supply a unique random password of at least 32 characters. Only its SHA-256 digest is configured server-side. The comparison uses a fixed-length timing-safe digest comparison; neither password nor hash is rendered into client props or logged by application code.

This shared perimeter password is not a substitute for customer authentication or per-person revocation. Pilot users must also sign in to a verified, non-anonymous **existing** Supabase account whose UUID is in the server-side allowlist (maximum ten). The allowlist is checked after sign-in and on every private read/write. Non-allowlisted sign-in sessions are discarded, including Secure cookie deletion. The existing ownership RLS, column grants and revision/account continuity checks remain intact. No elevated database key is used.

Only sign-in, signout and draft read/write are available in pilot mode. Registration, password recovery, password change and callbacks are denied before constructing the provider client. The account UI always shows sign-in and omits registration/recovery links. This prevents application-triggered external emails during the pilot. The owner's later test-account preparation is a separate approved operation; no account is created by deployment or tests.

Only an exact configured HTTPS hostname matching `4ir-…onrender.com` is accepted for this first pilot. Custom domains and other hosts fail closed. Host must match; X-Forwarded-Host does not grant access and X-Forwarded-Proto does not determine cookie security. Configure only `https://qcxtcwvibgizqynkjtja.supabase.co`, the dedicated 4IR Customer Portal project in organization `pwvtrcgaxbcuhmktgapu`. Another project URL or a secret/service-role/legacy JWT key is rejected; hosted mode accepts only a publishable-key format. Format validation alone cannot prove a key belongs to the intended project: the owner must verify pairing during later authorized configuration. Never use Munchies keys or user IDs.

Pilot cookies are host-only, HttpOnly, SameSite=Lax and Secure, including refresh and deletion. Auth/private responses remain private/no-store. Responses carry noindex/nofollow; indexing controls are not access control. Browser Basic credentials may remain cached after application signout: use separate/private browser sessions on trusted devices and close them when done. Rotate the shared access password or close the pilot to revoke that perimeter access. No URL-embedded credentials or passwords in chat/PRs.

The app gate/allowlist does **not** disable direct Supabase Auth/Data API access or revoke issued provider tokens. Supabase signup must remain disabled; do not create unrelated users in the pilot backend. RLS still protects ownership for direct authenticated requests. Closing the app is not a substitute for provider session revocation. This implementation creates no new database grant or policy and does not modify the already-applied migration.

## Later account and service setup — approval required

1. The owner selects or creates a dedicated **4IR Render account/workspace**, independent of Munchies, and handles login/MFA/terms personally. Confirm workspace identity, Free compute availability, monthly allowances, payment-method status and spending controls. Do not add a payment method or upgrade a plan for this pilot. Free compute alone is not a guarantee of zero usage charges when billing is enabled.
2. Review the exact PR commit and CI. Prefer the public repository URL for an explicitly authorized manual service setup if supported for the chosen source; it avoids a persistent GitHub integration grant. If a GitHub app connection is chosen, owner approval must limit it to `koketsokhwani-sys/4IR`. No access to Munchies or all repositories. Automatic deploys off; no preview deployments or webhook automation.
3. Approve the specific initial **closed** deployment, name, Frankfurt region, source commit/branch and Free plan. The Blueprint is a reviewable template, not an executed action. Confirm no paid instance, disk, database or auxiliary service in the creation screen. Stop if a charge or new permission is required. Do not run migrations from build/start hooks.
4. Verify the resulting exact HTTPS service hostname and Host handling with the app still closed. Check that the live Phase 1 site has no portal link, health reveals nothing, and signup stays disabled in Supabase. Validate TLS, headers and logs on the actual Render service; local tests do not certify Render ingress.
5. Separately approve preparation of the small pilot audience and test accounts in dedicated 4IR Supabase. Parent last reported zero Auth users; this work did not recheck or change that. No pilot can sign in until approved verified accounts exist. Decide how credentials are handed to those testers without external invitation/recovery email. No real customer/business data in the initial pilot.
6. With explicit approval to connect and admit those testers, configure server-side values below via the owner's secure dashboard workflow, then verify the exact project/key/user IDs. Do not retrieve/create credentials in chat. Render environment values can also be present during builds; never expose them through NEXT_PUBLIC_, build output, logs or client bundles. Disable previews and sharing of environment groups with other projects.
7. Approve the specific restricted rollout separately. Only then set both pilot gates. Verify perimeter denial, allowlisted sign-in, non-allowlisted rejection, no signup/email routes, ownership, Secure cookies and cache isolation on the actual host. Keep Supabase public signup off. Do not interpret successful pilot verification as permission to open public registration or payments.

| Server-side setting | Required later value |
| --- | --- |
| `PORTAL_MODE` | `render-pilot` only after rollout approval; `closed` otherwise |
| `PORTAL_PILOT_ENABLED` | Exact `true` only after rollout approval; `false` otherwise |
| `PORTAL_ORIGIN` | Verified exact `https://4ir-…onrender.com` origin, no path/port/credentials/query |
| `SUPABASE_URL` | Exact dedicated 4IR URL above |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key belonging to that project; no service or management key |
| `PORTAL_PILOT_ACCESS_SHA256` | Lowercase 64-character SHA-256 of the owner's unique random pilot password |
| `PORTAL_PILOT_USER_IDS` | Comma-separated exact verified account UUIDs; no spaces, empty entries or duplicates; at most ten |

The hash is access-control material and should be protected even though it is not the plaintext password. Generate the random password and digest using the owner's approved local password-management workflow; this preparation generates neither. Changing access settings requires a deliberate reviewed rollout/restart, not a public request parameter.

## Free-tier limits and cost safeguards

Render currently spins down Free services after 15 idle minutes; waking takes about a minute. Filesystem changes disappear on restart/spindown, so drafts stay only in the dedicated Supabase database. Free services have a 750-hour shared workspace allowance and may be suspended for unusually high outbound service traffic. No keep-alive cron or uptime pinger is configured. Render recommends against Free for production workloads. Free web services do not provide edge caching, which reduces one caching surface but does not remove the need to test all responses and future proxy changes.

Bandwidth and build allowances are separate from Free compute. Render's docs say overages can be billed when a payment method is present; without one, services/builds are suspended according to the exhausted allowance. The owner must verify actual account billing and spend controls before creation. No account/budget state was inspected or changed here. Do not add paid monitoring, databases, storage, custom domains, email services or upgrade to avoid suspension without further approval.

## Verification and remaining limits

`npm test` covers fail-closed configuration, dedicated-project enforcement, key types, allowlist bounds and timing-safe access checks. `npm run test:pilot` launches the production-built app on loopback, a temporary TLS terminator and the synthetic provider. A test-only process preload redirects the inert hosted URL to the loopback fixture and rejects other external fetches; it is never imported by application code or the Render launcher. Ephemeral test certificate/private key files are removed afterward; they are not account credentials. Tests verify trusted test TLS, not Render's public certificate.

The TLS checks cover the perimeter, forged hosts, forbidden email/signup/callback paths with zero provider calls, restricted UI, allowed and denied accounts, draft persistence, CSRF, Secure/HttpOnly/SameSite issuance, refresh and deletion, and private/no-store responses. Existing Chromium and real isolated Supabase CI remain required. No live provider/account/email is used in any pilot test. Do not include the test preload in a deployed startup command.

Local preparation evidence: eight Node/domain/PostgreSQL tests, sixteen Chromium fixture/API/browser tests, the two grouped TLS pilot scenarios, portal build and TypeScript passed. YAML parsing confirmed Free, automatic deploys off and closed defaults; the file was not submitted to Render validation. A targeted browser-bundle scan found no pilot access hash/secret, provider-key variable or dedicated project-reference marker. Migration SHA-256 is unchanged: `0f0cc8d8627d222d715fc125c74f1b0f040d039952c8724dceaa49dd9808cd08`. Exact-head CI is recorded in the PR checks.

Remaining actual-host acceptance: Render host/header behavior, public TLS, browser password-prompt usability and Secure-cookie persistence, secret/log redaction, no shared cached responses, service sleep/restart behavior, outbound provider access and configured rate/abuse controls. The shared password is a small-test perimeter, not a production identity gateway; strong random access material and a small approved audience are required. Complete script CSP, operational monitoring, privacy/retention, recovery and production capacity remain release work.

Rollback: set `PORTAL_MODE=closed` and `PORTAL_PILOT_ENABLED=false` and redeploy/restart after authorization. The provider/database stays intact. If access material leaks, close access and rotate it through the owner workflow; separately assess provider sessions. Never reset/drop the hosted database or enable email/signup to repair a pilot problem. Render Free only retains the two most recent prior deploys for rollback; record the exact commit and configuration as well.

## Sources checked

- [Render Free limits and billing behavior](https://render.com/docs/free)
- [Next.js Node web service deployment](https://render.com/docs/deploy-nextjs-app)
- [Render web service ports and public URL](https://render.com/docs/web-services)
- [Blueprint fields, Free plan, autoDeployTrigger and health checks](https://render.com/docs/blueprint-spec)
