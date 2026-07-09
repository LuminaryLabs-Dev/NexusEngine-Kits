import { exists, readJson, writeJson, writeText } from "./audit-utils.mjs";

const kitCatalog = readJson("kit-catalog.json");
const parity = exists("parity", "parity-status.json") ? readJson("parity/parity-status.json") : { kits: {} };
const rows = [];

for (const [domain, kits] of Object.entries(kitCatalog.domains ?? {})) {
  for (const kit of kits) {
    const base = ["kits", domain, kit];
    rows.push({
      domain,
      kit,
      cataloged: true,
      physicalFolder: exists(...base),
      index: exists(...base, "index.js"),
      docs: exists(...base, "README.md"),
      manifest: exists(...base, "kit.json"),
      smoke: exists(...base, "smoke.test.mjs"),
      realBehavior: kit === "completion-ledger-kit",
      status: kit === "completion-ledger-kit" ? "candidate" : (parity.kits?.[kit]?.status ?? "migration-placeholder")
    });
  }
}

const md = [
  "# Placeholder Matrix",
  "",
  "Generated from `kit-catalog.json`, physical files, and parity status.",
  "",
  "| Domain | Kit | Folder | Index | Docs | Manifest | Smoke | Real | Status |",
  "|---|---|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map((row) => `| ${row.domain} | ${row.kit} | ${row.physicalFolder ? "yes" : "no"} | ${row.index ? "yes" : "no"} | ${row.docs ? "yes" : "no"} | ${row.manifest ? "yes" : "no"} | ${row.smoke ? "yes" : "no"} | ${row.realBehavior ? "yes" : "no"} | ${row.status} |`),
  ""
].join("\n");

writeText("PLACEHOLDER-MATRIX.md", md);
writeText("audit/reports/placeholder-matrix.md", md);
writeJson("audit/reports/placeholder-matrix.json", rows);
console.log("placeholder matrix generated", { kits: rows.length });
