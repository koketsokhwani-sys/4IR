# Customer dashboard and submission workflow

This is draft engineering work, not an approved hosted migration or release. The existing customer foundation migration is unchanged. No billing, subscription, development authorization or launch approval is implemented.

## Customer journey

`PORTAL_PROJECT_WORKFLOW_ENABLED=true` enables the feature only alongside valid portal configuration. It defaults off and does not replace the existing Basic pilot gate, verified identity or pilot allowlist. The existing pilot configuration keeps the feature closed. This application switch is not a database permission switch: applying the migration grants verified customers the narrow submission capability directly through PostgREST. Hosted migration and feature activation require separate review.

Customers reach `/dashboard` from onboarding. It shows a completion checklist and the exact saved information. An explicit confirmation checkbox and submit action submit only that saved revision. Unsaved editor changes are never included. Required content: name, business name, business description, website text, and either phone or public business email; services for Business/Booking, availability for Booking, and products plus delivery/collection information for Store. Draft save requirements are unchanged. This is a minimal intake checklist, not commercial readiness validation.

Statuses are `submitted`, `changes_requested` and `ready_for_planning`. Ready for planning means a discussion can follow; it does not approve payment, development or launch. Customers can continue editing drafts, but submitted snapshots never change. Only requested changes permit another submission, using a newer saved revision. History displays the latest 20 submissions and their events; older database records are retained.

## Database and operator boundary

`20261105152617_project_submissions.sql` adds submissions and events with forced RLS and verified-owner read policies. Customers may insert only owner ID and draft revision; they cannot write status, snapshot, timestamps or review events. A private trigger verifies identity, locks the saved draft, checks revision/completion, and copies its snapshot. Another records the submission event atomically. Competing requests serialize on the draft; duplicate or stale requests create no extra events.

The database owner can use `private.review_submission(submission_id, outcome, customer_visible_note)` after a separately authorized review against the verified 4IR project. Outcomes are limited to `changes_requested` and `ready_for_planning`; a nonblank customer-visible note of at most 2,000 characters is mandatory. The function locks the submission and atomically records result and event. A second review of the same submission fails. SECURITY INVOKER grants no extra privilege, and EXECUTE is revoked from PUBLIC, anon, authenticated and service_role. There is no operator API, browser role selector, new account or credential.

An authorized database owner remains capable of direct SQL changes; this is not tamper-proof against that owner. Event `recorded_by` records the database session user and is hidden from customers, but does not establish individual human identity. Before broader operation, choose an independently authenticated operator interface and audit policy.

The SECURITY DEFINER functions are private trigger-only capabilities with empty search paths and no customer EXECUTE permission. No authorization uses editable customer metadata. `/api/project` also checks current Auth identity, account continuity, exact Origin, bounded request size, pilot access and feature flag. Responses are private/no-store; notes and content render as escaped text.

## Verification and release

PostgreSQL tests first populate the foundation schema, preserve the full existing draft row (including revision and timestamp) across the upgrade, and submit that saved revision afterward. Direct database and PostgREST regressions reject whitespace-only names without creating submission/history rows; SQL completion uses the ECMAScript trim character set. Tests also cover effective grants/RLS, package completion, forged identities/status/events, anonymous and unverified denial, immutable snapshots, duplicate/stale submission, pending-review blocking, review/resubmission and history. Browser fixtures exercise the checklist, confirmation, escaped notes, isolation, CSRF and mobile width. Isolated Supabase CI adds concurrent submissions, real PostgREST isolation and dashboard rendering; migrations and catalog checks run before and after replay.

Do not apply the migration to the hosted pilot as part of a code push. A future authorized rollout must verify the dedicated project and backup policy, review/apply the additive migration once, verify version/RLS/grants/advisors, test approved identities, then separately enable the flag. Signup and payments stay closed. If application checks fail, disable the feature flag and preserve drafts/submissions/events; do not drop tables or replay submissions. Database permission revocation is a separate reviewed operation. Existing account-deletion cascades also apply here; agree retention requirements before real customer use.
