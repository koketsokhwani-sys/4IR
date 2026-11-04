import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// These files are the Cloudflare Pages deployment contract, not a Next.js server.
const pages = [
  "index.html",
  "pricing.html",
  "get-started.html",
  "examples/bloom-studio.html",
  "examples/the-daily-grind.html",
  "examples/studio-form.html",
  "404.html",
];
for (const file of [...pages, "icon.svg", "_headers"]) {
  assert.ok((await stat(path.join("out", file))).size > 0, `${file} is empty`);
}

for (const file of pages) {
  const html = await readFile(path.join("out", file), "utf8");
  assert.match(html, /<main\b/, `${file} has no rendered page content`);
  const assets = [
    ...html.matchAll(/(?:src|href)="(\/_next\/[^"?]+)(?:\?[^" ]*)?"/g),
  ];
  assert.ok(assets.length, `${file} has no exported Next.js assets`);
  for (const [, asset] of assets) {
    assert.ok(
      (await stat(path.join("out", decodeURIComponent(asset)))).isFile(),
      `Missing asset ${asset}`,
    );
  }
}
const headers = await readFile("out/_headers", "utf8");
for (const expected of [
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "X-Frame-Options: DENY",
  "Permissions-Policy: camera=(), microphone=(), geolocation=()",
]) {
  assert.ok(headers.includes(expected), `Missing exported header: ${expected}`);
}
console.log(
  `Static export verified: ${pages.length} HTML pages, linked assets, icon and Cloudflare headers.`,
);
