# Hosted portal decision: configuration remains closed

Later decision: the owner approved **preparing** a Render Free pilot. [The Render pilot guide](PHASE-2-RENDER-PILOT.md) supersedes this document's undecided-runtime and unimplemented-gate status. This original assessment remains historical; no service/deployment is authorized by either document.

Assessment date: 4 November 2026. This is a proposed implementation contract, not a deployment configuration. No hosted mode, launch switch, remote connection, credential or deployment command is added. The approved database foundation exists separately; that does not authorize connecting the portal or opening signup. The public Phase 1 website stays on static Cloudflare Pages.

## Decision needed

The existing portal requires request-time Node-compatible Route Handlers for authentication, cookie refresh and private drafts. Its current `next start` deployment is tested locally. Static export cannot execute these handlers. Choose a separate portal runtime and an exact HTTPS origin before implementing hosted access; otherwise proxy trust, environment binding, cookie handling and cache behavior would be guesses.

| Option | Benefit | Work and decision required |
| --- | --- | --- |
| Separate Node 24 runtime behind HTTPS (recommended engineering starting point) | Closest to the runtime already exercised by the tests; retains Next.js and current request handlers | Owner chooses provider, budget, region, operator and portal domain. Validate proxy/header trust, cache bypass, resource limits, abuse protection and deployment/rollback. No provider or free entitlement is assumed. |
| Separate Cloudflare Worker | Can keep hosting operations with Cloudflare while leaving the marketing Pages project intact | Run a compatibility experiment first. Current Cloudflare docs recommend vinext for Next.js 16 and document OpenNext as another path. Pin and evaluate the selected path, its runtime bindings and Next.js/SSR compatibility; test locally before proposing an account connection. Owner approves limits, budget, domain and runtime choice. |

The recommendation is an inference from the current code and test coverage, not a cost comparison. No hosting plan, account usage or commercial entitlement was inspected. Do not assume either option is free for the production workload. Do not rewrite the application as a static browser client merely to fit Pages: that would change session storage and security boundaries and needs a separate design review.

## Proposed hosted configuration contract

These are requirements for a later reviewed change; the current parser rejects every mode except explicitly configured loopback `local`.

1. Separate configuration validity, portal access and registration gates. Default all access closed; a URL/key alone must never open the portal. An approved existing-account-only pilot must keep registration unavailable in both UI and API. Opening registration is another explicit decision. Password recovery sends email and therefore also requires separately approved delivery/configuration, even in a pilot.
2. Pin the one allowed backend to `https://qcxtcwvibgizqynkjtja.supabase.co` (4IR Customer Portal, organization `pwvtrcgaxbcuhmktgapu`). Reject other project references, aliases, custom backends, URL credentials, paths, query strings, fragments and alternate ports. Do not accept a wildcard `*.supabase.co` allowlist or environment fallback to another project. Munchies must never be a fallback. This document does not authorize a request to that URL.
3. Require an owner-approved exact portal HTTPS origin, distinct from local development and preview domains. Build callbacks from this origin, never request headers or submitted redirects. Determine whether the selected host preserves `Host`; accept forwarding headers only through its documented, tested trusted proxy boundary. Never blindly replace the current host check with `X-Forwarded-Host`.
4. Use only the dedicated project's publishable key for the application's Supabase client. Explicitly reject secret/service-role/admin keys and unsupported legacy keys in hosted configuration. A publishable-key format check cannot prove project ownership; verify project/key pairing through the approved setup process. Never request a database password, management token or service key for customer requests.
5. Keep provider configuration server-side in this architecture (no `NEXT_PUBLIC_` configuration or key sent to UI props); keep a fresh Supabase client per request with the customer's verified identity and RLS. Publishable keys are not secrets or an authorization boundary: direct API requests remain protected by RLS/grants, not by hiding the key. No browser SDK/token store is needed. Keep real secrets out of build inputs, source, fixtures, logs and PRs; do not share the marketing deployment's environment.
6. Use host-only HttpOnly, SameSite=Lax, Secure cookies over HTTPS, including refresh and deletion. Verify callback PKCE cookies, chunked sessions and deletion on the chosen runtime. Preserve local HTTP behavior only in loopback mode; never infer insecure cookies from an untrusted forwarded-protocol header.
7. Deny access before constructing the provider client when closed or invalid. All forms, GET/POST APIs and callback routes must follow the same gate. Auth/private responses must remain `private, no-store`; verify that CDN/proxy configuration actually bypasses caching and never replays `Set-Cookie` across customers. Recheck CSP, redirects and session logging on the chosen runtime.
8. Keep Supabase Auth signup disabled until explicitly authorized. An application switch cannot disable direct provider signup or invalidate issued tokens. Closing the app also is not provider-wide session revocation. Do not claim that hiding the registration form protects an otherwise open Auth project.

## Validation before any connection

Use synthetic credentials and a loopback provider exclusively for configuration and HTTP tests. Pure parser tests may contain the dedicated project's URL as inert text; they must not resolve or contact it. The existing fixture counter now verifies zero provider calls from closed and unsupported hosted modes, even with otherwise usable local configuration. Forms, private GET, callback and all POST actions are covered. The unit suite checks that public/launch-like variables and remote URL/key strings cannot activate the current portal.

After the runtime decision, add local TLS/proxy tests for the proposed hosted mode: malformed/cross-project URLs and privileged keys fail closed; correct origin/host only; untrusted forwarding headers cannot bypass checks; Secure cookies on issuance, refresh and deletion; callback allowlist and no open redirects; no provider calls with every gate off; registration/recovery independently denied; cache isolation across two sessions. Keep the existing local real-provider replay/isolation checks. A fake provider cannot certify hosted email delivery, TLS, CDN cache behavior, anti-abuse settings or project configuration.

Before authorizing a hosted pilot, record the tested commit and runtime, exact domain, key-provisioning procedure, signup/email settings, access restrictions, operational owner, budget limits and rollback. Rollback means close the app gate and revert application/configuration; do not drop or reset the hosted database. Session revocation and any provider-side account changes require separate authorization.

## Owner decisions still needed

- Node runtime/provider or Cloudflare Worker compatibility experiment; approved hosting budget and operator.
- Exact portal domain and preview/staging policy (previews must not receive production provider configuration).
- Pilot audience and access restriction; existing-account pilot versus later registration launch; approved sender/email delivery and anti-abuse controls.

No new SQL or migration is needed for this hosting assessment. The canonical migration stays `20261104172304_customer_foundation.sql` with unchanged bytes. See [production gates](PHASE-2-READINESS.md) for privacy, retention, backup, support and launch requirements.

Local validation for this assessment: six Node/domain/PostgreSQL tests, sixteen Chromium fixture/API/browser tests, portal production build, TypeScript and whitespace checks passed. The two closed-mode HTTP tests observed zero provider calls; an active local session test confirmed that the counter detects real fixture traffic. The migration SHA-256 remains `0f0cc8d8627d222d715fc125c74f1b0f040d039952c8724dceaa49dd9808cd08`. Exact-head CI is recorded by the PR checks; this local evidence does not establish hosted-runtime readiness.

## Documentation checked

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting): reverse proxy considerations for a Node deployment.
- [Cloudflare Next.js runtime paths](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/): current vinext recommendation and alternate paths; no adapter has been installed or validated here.
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys): publishable versus privileged keys. Server placement does not justify using a bypass-RLS key for customer operations.
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide): per-request clients, cookies and cache isolation.
- [Supabase changelog](https://supabase.com/changelog): CLI v3 local-default and hosted-confirmation changes reviewed. No CLI/SDK dependency or hosted command is changed by this assessment.
