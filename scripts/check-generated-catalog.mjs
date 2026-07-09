import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixedOutputs = [
  "installer/generated-catalog.js",
  "installer/generated-factories.js",
  "kit-catalog.json",
  "domain-catalog.json",
  "bundle-catalog.json",
  "nexusengine.registry.json",
  "promotion-ledger.json",
  "PROMOTION-LEDGER.md",
  "parity/parity-status.json",
  "docs/CDN-INDEX.txt"
];
const manifestFiles = fs.readdirSync(path.join(root, "manifests/kits")).filter((name) => name.endsWith(".json"));
const mirrors = manifestFiles.flatMap((name) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifests/kits", name), "utf8"));
  if (!manifest.entry) return [];
  const mirror = manifest.entry.replace(/^\.\//, "").replace(/index\.js$/, "kit.json");
  return fs.existsSync(path.join(root, manifest.entry.replace(/^\.\//, ""))) ? [mirror] : [];
});
const outputs = [...fixedOutputs, ...mirrors];
const before = new Map(outputs.map((relativePath) => [relativePath, fs.readFileSync(path.join(root, relativePath), "utf8")]));
const result = spawnSync(process.execPath, ["scripts/build-catalog.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
const changed = outputs.filter((relativePath) => before.get(relativePath) !== fs.readFileSync(path.join(root, relativePath), "utf8"));
if (changed.length) {
  throw new Error(`Generated catalog outputs were stale: ${changed.join(", ")}`);
}
console.log("generated catalog outputs match authoritative manifests", { outputs: outputs.length });
