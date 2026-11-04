# 4IR customer foundation: migration review and production gates

Status: **hosted foundation migration applied with explicit approval; portal launch is not approved**. The public Phase 1 site, closed signup and disabled payments remain unchanged. This checklist does not authorize further provisioning, credentials, external emails, hosted database changes, merging or deployment. Never use either Munchies project.

Hosted configuration assessment: [runtime options and proposed gated configuration](PHASE-2-HOSTING-DECISION.md). The runtime/provider, budget, exact HTTPS origin and pilot access policy need owner decisions. Remote configuration remains rejected; tests now verify zero provider requests from closed and unsupported hosted modes even when backend settings are present.

## Versioned migration and reproducibility

Canonical source: `apps/customer/supabase/migrations/20261104172304_customer_foundation.sql`. The SQL was originally reviewed under CLI-generated version `20261104134459`. After explicit owner approval, the parent applied those exact bytes once through the scoped 4IR connector, which recorded version `20261104172304`. The filename is reconciled to that actual history; SQL bytes are unchanged. The standalone candidate was removed to prevent two competing schema sources. Direct execution of the trigger helper is explicitly revoked from customer roles. No seed users, credentials, billing state or signup settings are included.

This is an initial migration for an empty, dedicated 4IR database with Supabase-managed `auth.users`, `auth.uid()`, `anon` and `authenticated` already present. It creates one table, three private functions, three RLS policies and one trigger. Existing objects with these names deliberately cause an error rather than silently being overwritten. It is applied once through migration history, not rerun manually as an idempotent script. Once deployed, preserve its contents and add new migrations for changes.

The PR's isolated CI starts from committed migrations, compares the applied version list with filenames, runs independent catalog assertions, security advisors and the real Auth/API/browser scenario, resets the local database using the same files, verifies network/loopback isolation and migration history again, checks that migration bytes did not change, and repeats review/advisors/scenario. The reset command is destructive and belongs only in the disposable test environment. CI never generates or repairs release history automatically and never targets a remote database.

Pinned validation components: Supabase CLI 3.0.0, PostgreSQL major 17 in local config, exact application dependencies in the lockfile, and the `ubuntu-24.04` runner. Service image patch versions come from the pinned CLI catalog; a CLI/image/major-version update requires replay validation again. GitHub runner image updates can still affect reproducibility, so record the run and commit for release evidence.

## Separate least-privilege review

The catalog review in `database/review-access.sql` is a second verification method independent of the migration text. It inspects effective rights, including inherited/public rights. This is an automated review plus a separate code-review pass, not a claim of a second human reviewer or third-party certification.

| Principal or component | Allowed | Denied or constrained |
| --- | --- | --- |
| Unauthenticated `anon` | No draft access | Every draft column, mutations and private helpers |
| Verified customer | Read own row; insert owner/plan/content; update own plan/content | Other customers, reassignment, revision/timestamp writes, deletion, truncate, references and trigger creation |
| Unverified or anonymous Auth user | No draft access | RLS requires verified email and rejects anonymous sign-ins, independently of the JWT's authenticated role |
| Identity helper | Zero-argument lookup of current `auth.uid()` in `auth.users` | No supplied user ID or editable metadata; private schema; fixed empty search path; no anonymous execution |
| Content validator and revision trigger | Invoker security; bounded package-specific strings; database-generated revision/time | Arbitrary content keys, oversized content, customer-controlled state; no direct trigger-helper execution |
| Database owner / privileged service roles | Administrative capabilities remain privileged | Never used by the portal; customer RLS cannot constrain a bypass-RLS administrator |

The table's owner ID is its primary key and indexed foreign key to `auth.users`; deletion of an Auth user cascades to that user's draft. There are no public views, storage buckets, role assignments, payment tables or privileged browser keys. The private schema must remain absent from the Data API's exposed-schema list. Catalog assertions check grants, forced RLS and the helper's empty search path; behavioral tests check customer isolation, unverified/anonymous denial, column denial, constraints, conflicts and deletion cascade. Real PostgREST tests additionally reject direct private-schema access.

Residual considerations: account deletion is irreversible for the draft; email verification is not business verification; access tokens may remain valid until expiry after logout; the revision integer has a finite limit and fails closed on overflow. Rate limiting, resource abuse, backups, audit retention and service-role governance require production controls. Customer drafts are personal/business data and need an approved retention/deletion policy.

## Release gates and decisions

| Gate | Current evidence | Required decision or evidence before release |
| --- | --- | --- |
| Dedicated backend | Parent verified dedicated Free London project `qcxtcwvibgizqynkjtja` in organization `pwvtrcgaxbcuhmktgapu`; approved migration applied | Keep this target separate from Munchies; approve production capacity, operational ownership and any future costs |
| Migration | Versioned SQL plus PR replay/advisor/catalog/API checks | Parent reported successful hosted application and clean postchecks; repository filename now matches hosted history. Verify exact-head replay CI and require new reviewed migrations for later changes |
| Hosting | Marketing stays on static Cloudflare Pages; portal is separate Node app | Choose Node hosting or validate a Workers adapter; approve costs, domains and deployment pipeline; static Pages alone cannot run this portal |
| Release configuration | Local-only URL gate intentionally rejects remote backends | Separate reviewed production configuration, fail-closed launch flag, trusted proxy/host rules, secure cookie handling and end-to-end closed-mode test |
| Auth and email | Real local PKCE, recovery, refresh and password-change tests | Approve sender/domain; verify delivery and redirect allowlist; review session lifetime, revocation, abuse limits, CAPTCHA and account enumeration behavior |
| Authorization | RLS, effective grants, two-customer isolation and private-schema denial | Re-run against exact release schema/config; confirm public-key-only application access and no privileged key in browser bundles/logs |
| Web security | Local origin/body controls, HttpOnly cookies, escaping and partial CSP | Production TLS, Secure cookies, CSRF/proxy/cache validation, complete script CSP, headers and token-free logging verified on target host |
| Operations | Test cleanup and bounded CI | Assign operator/on-call; define monitoring without personal data, incident response, backups/restore drill, availability and rotation processes |
| Data and legal | Synthetic data only; no live collection | Owner-approved privacy/consent text, retention/deletion/export process, support contact and commercial terms |
| Product acceptance | Package draft lifecycle tested | Decide completion/submission semantics, customer communications, profile editing and support workflow; uploads remain disabled |
| Launch authorization | Draft PR only | Explicit approval of reviewed commit, backend migration, deployment and signup opening; verify rollback and launch gate before each action |
| Payments | Absent and disabled | Separate scope and approval; never infer payment authorization from account/onboarding readiness |

## Failure recovery and rollout procedure

No deployment command is executed by this document or the PR workflow. An authorized operator must first identify the dedicated target, review the migration and pending history, take a verified backup if any data exists, and rehearse restore in a separate staging environment. Never use `db reset` against a hosted/production database or repair migration history to hide a mismatch.

Keep signup closed through migration and smoke tests. If application verification fails, leave signup closed and roll back the application/configuration or use a reviewed forward database correction. There is no automatic destructive down-migration: dropping this table loses customer content. Database restoration or deletion requires explicit approval based on the affected data and restore evidence. Record the exact applied version, commit, operator, test run and rollback outcome before requesting approval to open registration.
