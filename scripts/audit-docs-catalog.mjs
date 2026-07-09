import { createAudit, exists, readJson } from "./audit-utils.mjs";

const audit = createAudit("Docs Catalog Audit");
const kitCatalog = readJson("kit-catalog.json");
const bundleCatalog = readJson("bundle-catalog.json");

for (const domainId of Object.keys(kitCatalog.domains ?? {})) {
  const hasDocs = exists("domains", domainId, "README.md") || exists("domains", domainId, "DOCS.md");
  if (!hasDocs) audit.warn(`domain ${domainId} is listed but has no domain docs`);
}

for (const bundle of bundleCatalog.bundles ?? []) {
  const hasDocs = exists("bundles", bundle.id, "README.md") || exists("bundles", bundle.id, "DOCS.md");
  if (!hasDocs) audit.warn(`bundle ${bundle.id} is listed but has no bundle docs`);
}

const requiredDocs = [
  "README.md",
  "AGENTS.md",
  "KIT-CATALOG.md",
  "KIT-INSTALLER.md",
  "REBUILD-PARITY.md",
  "AAA-READINESS.md",
  "ROADMAP.md",
  "RELEASE-CHECKLIST.md",
  "docs/DOCS-INDEX.md",
  "docs/TESTING-GUIDE.md",
  "docs/SNAPSHOT-RESET-GUIDE.md",
  "docs/INSTALL-REPORT-GUIDE.md",
  "contracts/KIT-MANIFEST.md",
  "contracts/DOMAIN-MANIFEST.md",
  "contracts/STATUS-VALUES.md",
  "installer/INSTALLER-API.md",
  "installer/DOMAIN-INSTALL.md",
  "installer/BUNDLE-INSTALL.md",
  "parity/PROTOKITS-SOURCE-MAP.md"
];

for (const doc of requiredDocs) {
  if (!exists(doc)) audit.error(`required doc is missing: ${doc}`);
}

const aliases = [
  ["contracts/INSTALL-REPORT.md", "contracts/REPORT.md"],
  ["installer/CDN-RESOLUTION.md", "installer/CDN.md"],
  ["installer/ERROR-CODES.md", "installer/ERRORS.md"],
  ["docs/DOMAIN-BOUNDARY-GUIDE.md", "docs/DOMAIN-SCOPE-GUIDE.md"]
];

for (const [canonical, alias] of aliases) {
  if (!exists(canonical) && !exists(alias)) audit.warn(`canonical doc ${canonical} has no alias ${alias}`);
}

audit.finish("docs-catalog-report");
