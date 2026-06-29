import { createAudit, exists, readJson, writeText, writeJson } from "./audit-utils.mjs";

const audit = createAudit("Placeholder Audit");
const kitCatalog = readJson("kit-catalog.json");
const parity = exists("parity", "parity-status.json") ? readJson("parity/parity-status.json") : { kits: {} };

const firstWave = new Set([
  "completion-ledger-kit",
  "spatial-interaction-kit",
  "objective-bridge-kit",
  "lock-group-kit",
  "damage-health-kit",
  "resource-node-kit",
  "build-placement-kit",
  "structure-runtime-kit",
  "asset-descriptor-kit",
  "diegetic-feedback-signal-kit"
]);

const rows = [];

for (const [domain, kits] of Object.entries(kitCatalog.domains ?? {})) {
  for (const kit of kits) {
    const base = ["kits", domain, kit];
    const folder = exists(...base);
    const index = exists(...base, "index.js");
    const readme = exists(...base, "README.md");
    const manifest = exists(...base, "kit.json");
    const smoke = exists(...base, "smoke.test.mjs");
    const parityStatus = parity.kits?.[kit]?.status;
    const status = kit === "completion-ledger-kit" ? "candidate" : (parityStatus ?? "migration-placeholder");
    const realBehavior = kit === "completion-ledger-kit";

    if (status === "candidate") {
      if (!folder) audit.error(`${kit} is candidate but has no folder`);
      if (!index) audit.error(`${kit} is candidate but has no index.js`);
      if (!readme) audit.error(`${kit} is candidate but has no README.md`);
      if (!manifest) audit.error(`${kit} is candidate but has no kit.json`);
      if (!smoke) audit.error(`${kit} is candidate but has no smoke.test.mjs`);
      if (!realBehavior) audit.error(`${kit} is candidate but no real behavior rule is known`);
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
