import { createAudit, exists, readJson, writeText, writeJson } from "./audit-utils.mjs";

const audit = createAudit("Placeholder Audit");
const kitCatalog = readJson("kit-catalog.json");
const parity = exists("parity", "parity-status.json") ? readJson("parity/parity-status.json") : { kits: {} };
const manifestsById = new Map((kitCatalog.manifests ?? []).map((manifest) => [manifest.id, manifest]));

function relativePath(value) {
  return String(value ?? "").replace(/^\.\//, "");
}

const firstWave = new Set([
  "seed-kit",
  "fishing-kit",
  "seeded-world-patch-controller-kit",
  "camera-smooth-follow-kit",
  "procedural-creature-body-kit",
  "instanced-render-batch-kit",
  "agriculture-domain-kit",
  "procedural-object-body-kit",
  "procedural-object-material-kit",
  "procedural-object-lod-kit",
  "procedural-object-capture-profile-kit"
]);

const rows = [];

for (const [domain, kits] of Object.entries(kitCatalog.domains ?? {})) {
  for (const kit of kits) {
    const base = ["kits", domain, kit];
    const kitManifest = manifestsById.get(kit);
    const entryPath = relativePath(kitManifest?.entry);
    const entryFolder = entryPath.split("/").slice(0, -1).join("/");
    const folder = Boolean(entryFolder) && exists(entryFolder);
    const index = Boolean(entryPath) && exists(entryPath);
    const readmePath = relativePath(kitManifest?.proof?.readme);
    const readme = Boolean(readmePath) && exists(readmePath);
    const manifest = exists("manifests", "kits", `${kit}.json`) || exists(...base, "kit.json");
    const smokePath = relativePath(kitManifest?.proof?.smoke);
    const smoke = Boolean(smokePath) && exists(smokePath);
    const parityStatus = parity.kits?.[kit]?.status;
    const status = parityStatus ?? kitManifest?.status ?? "migration-placeholder";
    const realBehavior = Boolean(parity.kits?.[kit]?.realBehavior ?? kitManifest?.realBehavior);

    if (status === "candidate" || status === "official") {
      if (!folder) audit.error(`${kit} is ${status} but has no folder`);
      if (!index) audit.error(`${kit} is ${status} but has no index.js`);
      if (!readme) audit.error(`${kit} is ${status} but has no README.md`);
      if (!manifest) audit.error(`${kit} is ${status} but has no kit.json`);
      if (!smoke) audit.error(`${kit} is ${status} but has no smoke.test.mjs`);
      if (!realBehavior) audit.error(`${kit} is ${status} but no real behavior rule is known`);
    }

    if (firstWave.has(kit) && !folder) audit.warn(`first-wave kit ${kit} has no physical folder yet`);

    rows.push({ domain, kit, cataloged: true, folder, index, readme, manifest, smoke, realBehavior, status });
  }
}

const table = [
  "# Placeholder Matrix",
  "",
  "| Domain | Kit | Folder | Index | Docs | Manifest | Smoke | Real behavior | Status |",
  "|---|---|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map((row) => `| ${row.domain} | ${row.kit} | ${row.folder ? "yes" : "no"} | ${row.index ? "yes" : "no"} | ${row.readme ? "yes" : "no"} | ${row.manifest ? "yes" : "no"} | ${row.smoke ? "yes" : "no"} | ${row.realBehavior ? "yes" : "no"} | ${row.status} |`),
  ""
].join("\n");

writeText("audit/reports/placeholder-matrix.md", table);
writeJson("audit/reports/placeholder-matrix.json", rows);

audit.finish("placeholder-audit-report");
