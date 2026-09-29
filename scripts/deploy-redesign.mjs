import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

// Deploys the current .output build to a SEPARATE preview worker
// (alphaminds-redesign) so it never touches the production worker.
// Cron triggers are stripped to respect the free-plan 5-trigger account limit.
const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, "..", ".output", "server");
const srcPath = join(outDir, "wrangler.json");
const destPath = join(outDir, "wrangler-redesign.json");

const cfg = JSON.parse(readFileSync(srcPath, "utf-8"));
cfg.name = "alphaminds-redesign";
delete cfg.triggers;
writeFileSync(destPath, JSON.stringify(cfg, null, 2));
console.log(`Wrote preview config: ${destPath}`);

const res = spawnSync(
  "npx",
  ["wrangler", "deploy", "--config", destPath, "--name", "alphaminds-redesign"],
  { stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(res.status ?? 1);
