# 4IR owner acceptance and evidence — 2026-11-07

This checklist does not authorize hosted changes, signup, email or payments. No desktop or hosted inspection was performed in this pass. Keep Munchies separate.

## Current evidence and its limits

- [Application checks #29](https://github.com/koketsokhwani-sys/4IR/actions/runs/42181082373), completed/success at `326bcd2c33adb04edf421536eeb2e9e797c07861`: all three jobs passed, including 11 unit/PostgreSQL tests, 38 browser tests, local TLS pilot checks, builds/types/export, and real isolated Supabase lifecycle/ownership before and after migration replay, privilege review and cleanup. This is not hosted acceptance and does not cover subsequent uncommitted additions.
- [Render deployment record](https://dashboard.render.com/web/srv-dbm0uf6c6qcc73fkqfe0/deploys/dep-dbmkpg6i0phs73c5dtq0): coordinating parent reports deployment of `3a7a468e3d87cb0f51fdf8c67d2b9452156a1602`, closed gates and checkout HTTP 403 verified in thread `01a1a9f6-4cde-701e-b1e3-a43faf32a034`. This is previously verified parent-supplied evidence, not fresh live verification here. Current hosted SHA/settings remain unknown until read again. Test-only `326bcd2` was not deployed.
- The preserved, untracked overnight acceptance record dated 2026-11-05 describes an earlier `883cc4`-based unpushed candidate. Its pending-CI statements are historical, superseded for the later committed code by run #29. Its local observations remain useful within their stated scope.
- This executor still cannot run the full Supabase harness: it requires the dedicated GitHub job and refuses Docker `vfs`. That local limitation does not invalidate the later successful run on the supported CI runner.
- Native navigation investigation at `3a7a468`: the harmless Chromium control restored natively; actual private pages were excluded by no-store eligibility and loaded fresh. Synthetic restoration tests verify concealment before cancelable reload. No claim of zero cached pixels before native pageshow or all-browser/hosted behavior is established.

Applied migration bytes/history remain unchanged: `20261104172304_customer_foundation.sql` and `20261105162019_project_submissions.sql`. Do not replay or repair hosted history.

## Acceptance inventory

| Journey / boundary | Automated evidence | Still needs actual-host acceptance |
| --- | --- | --- |
| Four package intake, save/reload/relogin/submit | Four package journeys in `project-acceptance.spec.ts`; completion constraints in PostgreSQL tests | Owner checks package wording and fields on a real phone with approved synthetic account |
| Conflicts, account switch, outages, uncertain responses | `auth-lifecycle.spec.ts`, `project.spec.ts`: stale writes, no automatic replay, unsaved-edit preservation | Actual proxy timeouts and approved cross-tab/account journeys |
| Immutable snapshot, requested changes/resubmission, planning-ready denial | `project.spec.ts`, PostgreSQL and real Supabase CI | Separately authorized operator review; meaningful notes; customer/operator separation |
| Closing workflow preserves existing work | New local test `closing workflow access preserves an existing draft, snapshot and history`: absent/false/invalid flags deny project access; draft remains readable; enabled process returns identical snapshot/history | Separate processes share a fixture; this is not a live flag transition, service restart or hosted rollback drill |
| Closed access and absent payment actions | Existing-session gate tests in `portal.spec.ts`; authenticated TLS denials in `pilot-http.mjs`, without redirects or cookie-setting responses | Recheck actual deployed SHA, effective gates and ingress; never make a real checkout |
| Auth/session security | Fixture and real local PKCE/recovery/refresh/logout/isolation; loopback TLS cookie checks | Approved sender/domain and external delivery, redirect allowlist, actual HTTPS cookie refresh/deletion and abuse controls |
| Privacy and usability | Escaping, keyboard/narrow viewport, dirty navigation, restored-page lock | Real-device accessibility/navigation; native pre-handler paint timing unresolved |

## Approved bounded owner test — pending online access

The owner approved one existing owner account, its saved fictional draft, one submission and dashboard verification, approximately 20 minutes once access is ready, then closure with data preserved. The exact approved email is in the private coordinating conversation; do not copy it into this potentially public repository. No second identity, account creation, operator review/status changes or broader audience is authorized. User-PC is offline: this cloud task must not use the desktop, change hosted gates, deploy or submit hosted data.

1. **Preflight when access is available:** authorized coordinator records UTC time, Render service/domain, actual deployed SHA, non-secret effective gates and dedicated backend identity. Historical expected deployment is `3a7a468`, not test-only `326bcd2`; stop on mismatch/uncertainty. Confirm the existing signed-in identity privately matches the single approved owner account. No account creation, password reset or email sending.
2. **Record closure baseline:** verify current customer/project/payment denials and public signup/payment closure before any permitted temporary access. Health alone is insufficient. The online coordinator must have a verified path to close the pilot before starting; otherwise postpone.
3. **Start the bounded window only when access is ready:** record start time and target closure about 20 minutes later. Keep audience limited to that account, public signup and payments off. No hosted action is permitted from this offline cloud preparation task.
4. **Reopen the saved fictional draft:** verify existing fields/package/revision. Do not replace it with another package, create a new draft or add real business/customer data. If required content is missing or an existing submission is already present, stop and report rather than silently expanding scope or submitting again.
5. **Submit once and verify:** review the saved draft, explicitly confirm and click submit once. Expect one unpaid submission with its initial history event and dashboard status Submitted for review. Reload and leave/return to the dashboard; expect the same snapshot/history and no further submission action. On timeout or uncertain response, inspect/reload rather than clicking submit again. Do not request changes, mark planning-ready or execute privileged SQL.
6. **Close within the agreed window, including on failure:** online coordinator restores the recorded closed gates, verifies customer/project denial and signup/payment closure, and records the final SHA/settings. Preserve draft, submission and history; no deletion/reset. If closure cannot be verified, report immediately and do not claim completion.

**Connection-loss/manual-closure contingency:** the 20-minute target is a manually supervised window, not an automatic timer or expiry. Before opening, identify the already-authorized operator who can close access through an existing approved connection. If User-PC, the coordinator or the connection becomes unavailable, stop customer actions; do not retry a submission with unknown outcome. The available authorized operator closes the agreed pilot gates immediately and verifies denial. If no authorized closure path remains available, mark closure unverified and tell the owner at the next available coordination opportunity; do not claim that elapsed time closed access. Do not create another account, credential, grant or remote-control route to work around lost access. Once the approved connection returns, prioritize closure/readback, preserve all data, and inspect submission/history before considering any further action. A new test window requires coordination, not an automatic restart.

Record timestamp, role, deployed SHA, gate mode, synthetic case ID, expected/actual result, pass/fail/not-run and redacted evidence location. No secrets or account email in public artifacts. All six steps are currently hosted-not-run in this preparation pass.

## Remaining owner decisions

- The bounded one-account test above is approved; its online start time and safe access/closure readiness remain pending. Broader audience, new accounts, operator review and public signup require separate approval.
- Package completion wording, support/customer communications, operator identity/interface and individual audit policy. Database session user does not establish individual human operator identity.
- Sender/domain and email delivery approval, session/revocation/abuse controls, production CSP and actual-host security verification.
- Capacity/budget, operating owner, monitoring, incident/rotation procedures, backups and restore rehearsal.
- Privacy/consent/commercial text, retention/deletion/export rules and support contact.
- Separate payment implementation and approval. Drafts, submissions and planning-ready status remain unpaid.

## New local check

From `apps/customer`:

```sh
CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/project-acceptance.spec.ts --grep 'closing workflow access'
npm run typecheck
```

Only existing loopback fixtures are used. This new test/documentation is uncommitted on base `326bcd2`; run #29 covers the committed base, not this addition. The final test addition was subsequently checked alongside the full browser suite; this is new local evidence, not remote CI.

Local result: targeted acceptance **1 passed (10.8 seconds)**, including all three feature-off configurations; TypeScript **passed**. No application source changed. Final handoff validation: root `npm run build`, `npm run check`, and `npm run check:export` passed (7 HTML pages); customer `npm run build`, `npm run typecheck`, and full `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` passed (39 tests). `git diff --check` passed. Unit/TLS suites were unchanged and not rerun for this test-only addition. Real Supabase replay, remote CI and hosted acceptance were not run for this uncommitted work.

## Additional local rehearsal — 2026-11-07

`successful submission survives reload and dashboard return without resubmitting` uses only `one@example.test` and loopback fixtures. It counts exactly one browser project POST, verifies one snapshot/event, reloads and returns through onboarding, and compares the full project state after each return. This does not use the owner account or prove current hosted behavior.

Latest validation from `apps/customer`: focused `CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/project-acceptance.spec.ts --grep 'successful submission survives'` — **1 passed (9.0 seconds)**; `npm run typecheck` — **passed**; full `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` — **40 passed (37.2 seconds)**; repository `git diff --check` — **passed**. An initial invocation from repository root failed before running tests due to npm cache/package resolution; corrected working-directory runs above passed. Existing production build was reused because only tests/docs changed. No new build, unit/TLS suite, real Supabase replay, remote CI or hosted test was run in this pass. Earlier 39-test evidence is historical; this 40-test result covers both uncommitted additions.

## Lost-response review — 2026-11-07

The existing uncertain-response test already executed the submission upstream, dropped its browser response and recovered one submission via Refresh project. This pass strengthened that same test rather than adding a duplicate: require upstream HTTP 200; count one browser POST; assert one snapshot AND one event; reload and verify no submission control; deliberately retry the stale revision via local API (409); compare the complete stored project state unchanged. The stronger recovery-message assertion first failed: the network exception showed only `Failed to fetch`. A local one-line dashboard fix now always includes “Submission could not be confirmed. Refresh the project before retrying.” before the existing error detail. This message change is uncommitted and not deployed; it must not be assumed present on the historical hosted commit.

Final local validation: focused uncertain-response check **1 passed**; customer `npm test` **11 passed**, `npm run build`, `npm run typecheck`, full `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` **40 passed**, and `npm run test:pilot` **all 3 reported groups passed**. Root `npm run build`, `npm run check`, `npm run check:export` (7 HTML pages) and `git diff --check` passed. No hosted/desktop operation, remote CI or real Supabase replay was performed. No automatic closure timer exists; use the manual contingency above.
