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

### Diagnosing a failed build

Check the failed deployment's commit SHA and branch first. While PR #2 is a draft, `main` does not contain the static-export configuration. Test `codex/cloudflare-pages-static-export` as a preview; production can use `main` after the change is reviewed and merged.

Confirm the project is **Pages**, the build command is `npm run build`, the output directory is `out`, and Node is 24. The server-oriented Next.js preset, `.next` output directory, `next export`, and a Workers deploy command do not match this project. See [Cloudflare's static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

If those settings match, capture the first failing command and its error from the deployment log, together with the commit SHA. A successful local build does not identify a remote failure without that evidence. No Cloudflare failure log or project configuration was available during the takeover checks.

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

Validation on 4 November 2026: the production build generated `out/` successfully, including the formerly dynamic package chooser. TypeScript and the export artifact checks passed. The full dependency audit reported zero vulnerabilities. Takeover validation also passed in local Chromium: six direct routes, all four package names/prices, missing/invalid/repeated plan parameters, client selection, browser back/forward, FAQ expansion, mobile navigation, mobile overflow checks at 390px, and unknown-route HTTP 404, with no page errors. The checks exposed mobile overflow from comparison accessibility labels and rotated hero artwork; both are now contained without changing the layout. Cloudflare-hosted routing, custom 404 content and response headers still require a Pages preview check.
