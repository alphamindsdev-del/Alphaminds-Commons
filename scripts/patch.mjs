import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, "..", ".output", "server");

// 1. Add static import + /v1/* routing to index.mjs
const idxPath = join(outDir, "index.mjs");
let idx = readFileSync(idxPath, "utf-8");

const importLine = 'import { default as __ssr } from "./_ssr/ssr.mjs";';
if (!idx.includes(importLine)) {
  idx = idx.replace("globalThis.__nitro_main__ = import.meta.url;", `globalThis.__nitro_main__ = import.meta.url;\n${importLine}`);
}

const oldHandler = `var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
\tif (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });`;

const newHandler = `var cloudflare_module_default = createHandler({ async fetch(cfRequest, env, context, url) {
\tif (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
\tif (url.pathname.startsWith("/v1/") || url.pathname === "/v1") {
\t\treturn __ssr.fetch(cfRequest, env, context);
\t}
} });`;

if (!idx.includes("__ssr.fetch")) {
  idx = idx.replace(oldHandler, newHandler);
}
writeFileSync(idxPath, idx);

// 2. Fix wrangler.json — Nitro caches can produce stale values for name, env, and crons,
//    and leftover env blocks cause "Redirected configurations cannot include environments"
const wrPath = join(outDir, "wrangler.json");
let wr = JSON.parse(readFileSync(wrPath, "utf-8"));
let wrChanged = false;

// Force correct worker name (Nitro sometimes picks up old cached value)
if (wr.name !== "alphaminds") {
  wr.name = "alphaminds";
  wrChanged = true;
}

// Force production environment
if (wr.vars?.ENVIRONMENT !== "production") {
  wr.vars = { ...(wr.vars || {}), ENVIRONMENT: "production" };
  wrChanged = true;
}

// Strip leftover staging/production env blocks
if (wr.env && (wr.env.staging || wr.env.production)) {
  delete wr.env;
  wrChanged = true;
}

// Keep only 5 crons (free plan limit), remove impact score + weekly summary
if (wr.triggers?.crons) {
  const keep = [
    "0 5 * * *",
    "30 0 * * *",
    "0 1 * * *",
    "0 0 * * 1",
    "0 4 * * *",
  ];
  if (JSON.stringify(wr.triggers.crons) !== JSON.stringify(keep)) {
    wr.triggers.crons = keep;
    wrChanged = true;
  }
}

if (wrChanged) {
  writeFileSync(wrPath, JSON.stringify(wr, null, 2));
  console.log("Patched .output/server/wrangler.json (name, env, triggers)");
} else {
  console.log("Patched .output/server for deployment");
}
