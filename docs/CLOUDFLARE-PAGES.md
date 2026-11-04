# Cloudflare Pages deployment — Phase 1

The application uses Next.js Static HTML Export (`output: "export"`). `npm run build` compiles and exports the full Phase 1 website to `out/`; there is no separate `next export` command or runtime Next.js server.

## Pages build configuration

Connect the GitHub repository to a Cloudflare Pages project:

| Setting                | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Framework preset       | Next.js (Static HTML Export), or None with the values below |
| Production branch      | `main`                                                      |
| Root directory         | Repository root (leave blank)                               |
| Build command          | `npm run build`                                             |
| Build output directory | `out`                                                       |
| Node version           | `NODE_VERSION=24`                                           |

Commit and retain `package-lock.json`. Pages can install dependencies using npm and the lockfile. No Supabase, Paystack or other secrets are needed for Phase 1. Do not configure `@cloudflare/next-on-pages`, a Worker adapter or Pages Functions for this static deployment. A preview deployment can use this pull request's branch before merging.

## Compatibility review

- **Homepage, pricing, layout and footer:** render into HTML at build time. The footer year is captured at build time; rebuild to refresh it in a new year.
- **Portfolio examples:** `generateStaticParams` enumerates all three slugs. `dynamicParams = false` prevents runtime generation. Unknown paths use the exported `404.html`.
- **Package selection:** server `searchParams` was incompatible with static export. The same chooser markup now runs behind a client `useSearchParams` boundary with Suspense. Existing `/get-started?plan=...` links, prices, features and switching behavior remain intact. The static fallback is the unselected chooser; selecting a package requires browser JavaScript. Missing, invalid or repeated plan values keep the chooser unselected, as before.
- **Navigation and FAQs:** client navigation and menu behavior are retained. Native FAQ expansion still works without JavaScript.
- **Security headers:** Next.js `headers()` requires a server, so its existing policies are preserved in `public/_headers`, which is copied to `out/_headers` and applied by Cloudflare Pages.
- **Images and services:** there are no `next/image` optimizations, server actions, cookies, API routes, authentication or payment endpoints to export. All current illustrations are CSS, and the favicon is a static SVG.

Cloudflare Pages serves the exported `.html` files at clean URLs, including direct requests to `/pricing`, `/get-started` and `/examples/bloom-studio`. The top-level `404.html` preserves normal not-found behavior; do not add an SPA catch-all redirect to `index.html`.

## Local verification

```sh
npm ci
npm run build
npm run typecheck
npm run check:export
npm start
```

`npm start` serves `out/` at `http://localhost:3000` using a static file server. It does not emulate Cloudflare's `_headers` processing. GitHub Actions builds, type-checks and verifies required exported pages, linked JS/CSS assets, the favicon and headers.

After a Pages preview deployment, verify all direct routes, the three portfolio examples and the custom 404. On `/get-started`, test all four plan links, an unknown plan, no plan, repeated plan parameters, and browser back/forward. Inspect response headers to confirm all four policies. Browser/hydration checks still require a supported browser; artifact checks do not establish browser behavior.

No hosting project, domain, deployment, Phase 2 account flow or payment integration is created by this change. Future server-backed phases will require a separate deployment architecture review.

Validation on 4 November 2026: the production build generated `out/` successfully, including the formerly dynamic package chooser. TypeScript and the export artifact checks passed. The full dependency audit reported zero vulnerabilities. Browser hydration and Cloudflare-hosted response headers remain to be checked on a Pages preview deployment.
