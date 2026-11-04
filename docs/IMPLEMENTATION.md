# Implementation notes

## Phase 1 scope

The app uses the actual Next.js framework with TypeScript and Tailwind v4 through PostCSS. Development and production builds use Next.js’s supported Webpack option because Turbopack’s CSS worker socket is blocked by this environment’s sandbox. Public pages are rendered at build time and exported as static files. The navigation menu and query-string package selection run in the browser. Package definitions, feature availability, FAQs and illustrative project data are centralised in `src/lib/content.ts`.

Package buttons navigate to a real details page and preserve their selected plan in the URL. Static hosting cannot read query strings on the server, so the selected package appears after JavaScript hydrates; the exported fallback shows the unselected chooser. Missing, unknown and repeated plan parameters leave the chooser unselected. Selecting a different plan works without authentication. Registration and checkout are explicitly unavailable until their designated phases. No fake submissions, fabricated testimonials, live-client claims, customer records or payment actions are included.

The visual system uses ivory, green and coral, responsive layouts, original CSS illustrations and limited motion. Illustrations are decorative and hidden from assistive technology; the surrounding text describes each concept. They require no third-party image requests. Native details elements keep FAQ interactions available without JavaScript. The comparison table scrolls within its container on small screens.

Phase 1 feature descriptions are initial package proposals, editable centrally. Confirm commercial inclusions, final domain fees, VAT treatment, service terms and privacy notice before opening registration. No launch timelines or customer counts are invented.

## Verification

Run `npm run build` followed by `npm run typecheck`. GitHub Actions repeats these checks on pull requests and pushes to main/work. A production build verifies compilation, generated route types and static export of the homepage, pricing, package chooser and all three example pages. Run `npm run check:export` to verify the `out/` deployment artifacts.

Validation on 3 November 2026: production compilation, build-time TypeScript checking and static generation passed with Next.js 16.4.5. The standalone `npm run typecheck` passed. `npm audit --omit=dev` reported zero vulnerabilities, and `git diff --check` passed. The build required permission to launch compiler subprocesses in this sandbox.

Browser review checklist (requires a supported browser session):

- At 375px, 768px and 1440px, check readability, navigation, section spacing, pricing and no page-wide overflow.
- Open/close the mobile menu and follow each navigation link.
- Navigate with the keyboard; check the skip link, visible focus and FAQ toggles.
- Select each package and verify name, price, features and URL; try an invalid plan ID.
- Open all three concept pages; unknown slugs must return the 404 page.
- Confirm no card fields, account forms or payment calls are available.
- Check with reduced motion enabled.

Automated build/type checks do not establish browser accessibility, visual quality or end-to-end runtime behavior. The session did not expose the supported `cua_repl.js` browser tool, so browser QA and screenshots were not performed.

## Incremental roadmap

1. **Public website (this release):** marketing, pricing, navigation, concepts and package selection.
2. **Authentication/onboarding:** Supabase email verification and recovery, secure SSR sessions, profile/business schema, ownership-based RLS, private uploads and package-specific draft onboarding. Use current Supabase docs when implementation begins; never authorise from user-editable metadata. Confirm project and email-provider configuration before integrating.
3. **Customer dashboard:** implement the complete project workflow: Registration → Payment Received → Awaiting Information → Design in Progress → Website Preview → Customer Review → Approved for Launch → Website Live. Persist and authorise project transitions, file access and support requests.
4. **Paystack test billing:** derive amounts from server-side package records; require a registered verified customer; verify first payment on the server; validate signed webhook bodies; process events idempotently; record successful/failed payments and receipts. Respect provider scheduling, reconcile webhook delays, and test cancellation/reactivation and service-end dates. Separate cancellation from account deletion. Live keys remain disabled until tests pass.
5. **Admin CRM/support:** enforce administrator access on the server and in database policies; customer/project/payment/lead/support management, audit logs, cancellation feedback, MRR, active/overdue subscriptions and acquisition reports.
6. **Preview/approval/marketing:** authorise previews, revisions and approval history; marketing upsell pipeline and consent-aware automation.

No database migrations, Supabase resources, payment plans, webhook routes, customer accounts or hosting resources have been created. Future integration credentials must be provided through local ignored environment files or the hosting secret manager. Supabase privileged keys and Paystack secret keys must never have a `NEXT_PUBLIC_` prefix or be imported into client components.
