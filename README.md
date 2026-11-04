# 4IR Digital Services Platform

Production-oriented subscription website platform for South African entrepreneurs and microbusinesses. Application package: `4ir-platform`. The attached repository is named `4IR` and its existing origin is preserved.

## Current release: Phase 1

Implemented with Next.js App Router, TypeScript, React and Tailwind CSS:

- Responsive public homepage with the supplied headline and supporting text.
- Four monthly ZAR packages: Starter Presence R50, Business Profile R99, Booking Pro R150 and Online Store R200.
- Dedicated pricing page, accessible feature comparison and package selection through URL parameters.
- Three original, clearly labelled fictional portfolio concepts with individual detail routes.
- Native expandable FAQs, mobile navigation, skip link, visible keyboard focus and reduced-motion support.
- Page metadata, favicon, custom 404 and baseline security headers.
- Central package configuration in `src/lib/content.ts` and GitHub Actions build/type checks.

Account registration, payments, onboarding, dashboards and CRM are later phases. Package selection does not collect personal information, charge cards or create subscriptions. Example websites are illustrative, not working stores or booking systems.

## Local setup

Use Node.js 24 LTS (minimum 22) and npm. No environment variables, external fonts, image services or backend accounts are needed for Phase 1.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. For production-mode validation:

```sh
npm run build
npm run typecheck
npm start
```

`npm run build` generates the static site in `out/`. `npm start` serves that directory locally on port 3000 without a Next.js server. Run `npm run check:export` to verify the deployment artifacts.

Next.js generates route types during development/build; run the build before the standalone type check in a clean checkout. `npm run check` is an alias for the TypeScript check. Commit `package-lock.json` and use `npm ci` to reproduce dependencies.

## Routes

| Route                        | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `/`                          | Public marketing site                       |
| `/pricing`                   | Packages and full comparison                |
| `/get-started?plan=business` | Selected package details and release status |
| `/examples/bloom-studio`     | Florist concept                             |
| `/examples/the-daily-grind`  | Café concept                                |
| `/examples/studio-form`      | Wellness concept                            |

Supported plan IDs: `starter`, `business`, `booking`, `store`. Missing or unknown plan IDs show the package selector; they never silently select a chargeable plan. Unknown example slugs return 404.

## Configuration and next phases

See `docs/IMPLEMENTATION.md` for scope, verification and the next-phase requirements. Phase 1 is configured for Cloudflare Pages Static HTML Export. See `docs/CLOUDFLARE-PAGES.md` for deployment settings, routing and verification. No backend secrets are required. Deployment and domain configuration have not been performed.

Before Phase 2, select a Supabase development project and configure its URL, publishable key, email verification/recovery redirects and email delivery. Plan ownership-based Row Level Security and private upload access before storing customer data. No Supabase project is created by this release.

Before Phase 4, configure a Paystack test account, server-only test secret, webhook endpoint and callback URL. Do not enable live payments until server-side verification, signed webhooks, recurring billing, cancellation, idempotency and reconciliation have passed integration tests.
