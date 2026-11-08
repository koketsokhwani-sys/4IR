# 4IR hosted foundation: application and version reconciliation record

The prior prospective integration plan is superseded by this record. Do not reapply the initial migration.

## Authorized application and reported postchecks

Koketso explicitly approved applying the tested SQL through the connected 4IR account, accepting the connector-generated version, and reconciling the draft repository afterwards. The parent reports one successful application to project `qcxtcwvibgizqynkjtja` (4IR Customer Portal), organization `pwvtrcgaxbcuhmktgapu` (4IR Studio), followed by scoped readback:

- Exactly one migration: version `20261104172304`, name `customer_foundation`.
- `public.onboarding_drafts` exists, with RLS enabled and forced and the three expected policies.
- Anonymous SELECT denied; authenticated DELETE and MAINTAIN denied.
- Zero draft rows and zero Auth users; no security advisories.

These hosted findings were supplied by the parent, not re-queried during repository reconciliation. The website remains disconnected and signup closed. Munchies is excluded.

## Exact artifact identity

| Field | Value |
| --- | --- |
| Reviewed source commit | `11b9dee694cb1faca075c7af626d9dfa1eb57b56` |
| Original reviewed version | `20261104134459` |
| Actual connector-recorded version | `20261104172304` |
| Canonical repository path | `apps/customer/supabase/migrations/20261104172304_customer_foundation.sql` |
| Git blob SHA-1 | `8a67af15f1f58626b39fcc87e0fc7caa9ecfdd69` |
| SHA-256 | `0f0cc8d8627d222d715fc125c74f1b0f040d039952c8724dceaa49dd9808cd08` |
| Length | 4,372 bytes |

Reconciliation renames the file and updates references only; its SQL contents remain byte-for-byte equal to the reviewed source blob. The original timestamp must not remain as a second migration file, which could cause an attempted duplicate application. No SQL, migration-history repair or hosted changes are part of this reconciliation.

## Validation and future operations

The existing isolated PR workflow applies the committed version to a disposable local Supabase stack, compares database migration history to repository filenames, reviews effective privileges, runs security advisors and the synthetic Auth/API/onboarding scenario, then resets and repeats using the same bytes. No hosted credentials or connections are present in that workflow. Consult the exact-head checks on draft PR #3 for the reconciliation result.

Preserve this applied migration's bytes and version going forward. Create a new reviewed migration for any schema change. Never rename hosted history, retain the superseded file, use history repair to mask a mismatch, or run the initial SQL again. If a future preflight shows this migration pending on this target, stop and investigate the target/history rather than applying it.

The repository's SQL header is intentionally unchanged: the migration file itself does not authorize hosted execution or signup activation; the separate explicit user approval authorized the one application recorded here.

## Remaining launch gates

See [the production-readiness checklist](PHASE-2-READINESS.md). The portal still accepts loopback-only configuration; a hosted project existing and containing a schema does not connect it to the website. Production hosting, safe remote configuration, TLS/Secure cookies/CSP, email delivery, abuse controls, retention, backup/restore and operational ownership need review and appropriate authorization. No new credentials, users, external emails, payments, merge, deployment or signup opening are authorized by this record.
