import { createAudit, exists, readJson } from "./audit-utils.mjs";

const audit = createAudit("Catalog File Audit");
const kitCatalog = readJson("kit-catalog.json");
const domainCatalog = readJson("domain-catalog.json");
const bundleCatalog = readJson("bundle-catalog.json");

for (const domainId of Object.keys(kitCatalog.domains ?? {})) {
  if (!exists("domains", domainId, "index.js")) audit.error(`domain ${domainId} is listed in kit catalog but has no domains/${domainId}/index.js`);
  if (!exists("domains", domainId, "README.md") && !exists("domains", domainId, "DOCS.md")) audit.warn(`domain ${domainId} has no README.md or DOCS.md`);
}

for (const domain of domainCatalog.domains ?? []) {
  if (!exists("domains", domain.id)) audit.error(`domain catalog entry ${domain.id} has no physical domain folder`);
  const entry = String(domain.entry ?? "").replace(/^\.\//, "");
  if (!entry || !exists(entry)) audit.error(`domain catalog entry ${domain.id} path missing: ${domain.entry}`);
}

for (const bundle of bundleCatalog.bundles ?? []) {
  const entry = String(bundle.entry ?? "").replace(/^\.\//, "");
  if (!entry || !exists(entry)) audit.error(`bundle ${bundle.id} path missing: ${bundle.entry}`);
  if (!exists("bundles", bundle.id, "README.md")) audit.warn(`bundle ${bundle.id} has no README.md`);
}

const firstWave = [
  ["foundation", "seed-kit"],
  ["aquatic", "fishing-kit"],
  ["simulation", "seeded-world-patch-controller-kit"],
  ["camera-feedback", "camera-smooth-follow-kit"],
  ["procedural-creatures", "procedural-creature-body-kit"],
  ["render-descriptors", "instanced-render-batch-kit"],
  ["production", "agriculture-domain-kit"],
  ["procedural-objects", "procedural-object-body-kit"],
  ["procedural-objects", "procedural-object-material-kit"],
  ["procedural-objects", "procedural-object-lod-kit"],
  ["procedural-objects", "procedural-object-capture-profile-kit"]
];

for (const [domain, kit] of firstWave) {
  const base = ["kits", domain, kit];
  if (!exists(...base, "index.js")) audit.error(`first-wave kit ${kit} has no index.js`);
  if (!exists(...base, "README.md")) audit.warn(`first-wave kit ${kit} has no README.md`);
  if (!exists(...base, "source-parity.md")) audit.warn(`first-wave kit ${kit} has no source-parity.md`);
  if (exists(...base, "README.md") && !exists(...base, "kit.json")) audit.warn(`documented first-wave kit ${kit} has no kit.json`);
}

audit.finish("catalog-files-report");
