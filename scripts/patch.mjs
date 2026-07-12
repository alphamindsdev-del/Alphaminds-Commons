import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, "..", ".output", "server");

// 1. Add static import + /v1/* routing to index.mjs
const idxPath = join(outDir, "index.mjs");
let idx = readFileSync(idxPath, "utf-8");

// Add static import after first line
const importLine = 'import { default as __ssr } from "./_ssr/ssr.mjs";';
if (!idx.includes(importLine)) {
  idx = idx.replace("globalThis.__nitro_main__ = import.meta.url;", `globalThis.__nitro_main__ = import.meta.url;\n${importLine}`);
}

// Replace the createHandler block completely
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

// 2. Remove env block and triggers from wrangler.json (env causes deploy errors, triggers fail on free plan)
const wrPath = join(outDir, "wrangler.json");
let wr = JSON.parse(readFileSync(wrPath, "utf-8"));
if (wr.env && (wr.env.staging || wr.env.production)) {
  delete wr.env;
}
if (wr.triggers) {
  delete wr.triggers;
}
if (wr.env || wr.triggers) {
  writeFileSync(wrPath, JSON.stringify(wr, null, 2));
}

console.log("Patched .output/server for deployment");
