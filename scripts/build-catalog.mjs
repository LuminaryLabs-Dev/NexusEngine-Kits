import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function readManifestFolder(folder) {
  return fs.readdirSync(path.join(root, folder))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(`${folder}/${name}`));
}

function assertUnique(records, field, label) {
  const seen = new Map();
  for (const record of records) {
    const value = record[field];
    if (value == null) continue;
    if (seen.has(value)) throw new Error(`${label} ${field} collision: ${value} (${seen.get(value)} and ${record.id})`);
    seen.set(value, record.id);
  }
}

function sha256(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath.replace(/^\.\//, "")));
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("base64")}`;
}

function exists(relativePath) {
  return relativePath != null && fs.existsSync(path.join(root, relativePath.replace(/^\.\//, "")));
}

function moduleImportPath(entry) {
  return `../${entry.replace(/^\.\//, "")}`;
}

function js(value) {
  return JSON.stringify(value, null, 2);
}

const registryConfig = readJson("manifests/registry.json");
const rawKits = readManifestFolder("manifests/kits");
const domains = readManifestFolder("manifests/domains");
const bundles = readManifestFolder("manifests/bundles");

assertUnique(rawKits, "id", "kit");
assertUnique(rawKits, "domainPath", "kit");
assertUnique(rawKits, "apiName", "kit");
assertUnique(domains, "id", "domain");
assertUnique(domains, "domainPath", "domain");
assertUnique(bundles, "id", "bundle");

const kitIds = new Set(rawKits.map((manifest) => manifest.id));
const domainIds = new Set(domains.map((manifest) => manifest.id));
const additionIds = new Set(registryConfig.promotion.approvedAdditionIds);
const resolvedStatuses = new Set(["official", "deprecated", "archived"]);
const distributedRuntimeStatuses = new Set(["official", "deprecated"]);

for (const manifest of rawKits) {
  if (manifest.schemaVersion !== "nexusengine.kit-manifest.v1") throw new Error(`${manifest.id}: unsupported schemaVersion`);
  for (const field of ["id", "version", "status", "kind", "domain", "domainPath", "apiName", "factory", "entry"]) {
    if (!manifest[field]) throw new Error(`${manifest.id}: missing ${field}`);
  }
  if (!domainIds.has(manifest.domain)) throw new Error(`${manifest.id}: unknown domain ${manifest.domain}`);
  if (!manifest.domainPath.startsWith("n:")) throw new Error(`${manifest.id}: domainPath must start with n:`);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(manifest.apiName)) throw new Error(`${manifest.id}: invalid apiName ${manifest.apiName}`);
  if (!Array.isArray(manifest.requires) || !Array.isArray(manifest.provides)) throw new Error(`${manifest.id}: requires/provides must be arrays`);
  if (!manifest.promotion || typeof manifest.promotion.resolved !== "boolean") throw new Error(`${manifest.id}: missing promotion state`);
  if (!manifest.promotion.resolved && !manifest.promotion.blocker) throw new Error(`${manifest.id}: unresolved entries require an exact blocker`);
  if (manifest.promotion.resolved !== resolvedStatuses.has(manifest.status)) throw new Error(`${manifest.id}: resolved flag disagrees with status ${manifest.status}`);
  if (distributedRuntimeStatuses.has(manifest.status)) {
    if (!manifest.realBehavior) throw new Error(`${manifest.id}: ${manifest.status} entries require realBehavior`);
    if (!exists(manifest.entry)) throw new Error(`${manifest.id}: ${manifest.status} entry is missing: ${manifest.entry}`);
    if (!manifest.packageExport) throw new Error(`${manifest.id}: ${manifest.status} entries require a package export`);
    if (!/^[a-f0-9]{40}$/i.test(manifest.source?.resolvedCommit ?? "")) throw new Error(`${manifest.id}: ${manifest.status} source requires a full commit SHA`);
    for (const field of ["readme", "smoke", "parity", "limitations"]) {
      if (!exists(manifest.proof?.[field])) throw new Error(`${manifest.id}: ${manifest.status} proof is missing: ${field}`);
    }
  }
}

for (const domain of domains) {
  for (const kitId of domain.kits ?? []) if (!kitIds.has(kitId)) throw new Error(`${domain.id}: unknown kit ${kitId}`);
}
for (const bundle of bundles) {
  for (const domainId of bundle.domains ?? []) if (!domainIds.has(domainId)) throw new Error(`${bundle.id}: unknown domain ${domainId}`);
  for (const kitId of bundle.kits ?? []) if (!kitIds.has(kitId)) throw new Error(`${bundle.id}: unknown kit ${kitId}`);
}

const baseline = rawKits.filter((manifest) => !additionIds.has(manifest.id));
const additions = rawKits.filter((manifest) => additionIds.has(manifest.id));
if (baseline.length !== registryConfig.promotion.baselineCount) {
  throw new Error(`baseline manifest count drift: expected ${registryConfig.promotion.baselineCount}, received ${baseline.length}`);
}
if (additions.length !== additionIds.size) throw new Error(`approved addition count drift: expected ${additionIds.size}, received ${additions.length}`);

const kits = rawKits.map((manifest) => {
  const implementationPath = manifest.module?.node ?? manifest.module?.package;
  return {
    ...manifest,
    stability: manifest.status,
    integrity: implementationPath && exists(implementationPath) ? sha256(implementationPath) : null
  };
});

const domainMap = Object.fromEntries(domains.map((domain) => [domain.id, [...domain.kits]]));
const bundleMap = Object.fromEntries(bundles.map((bundle) => [bundle.id, [...bundle.domains]]));
const catalog = {
  name: "@luminarylabs/nexusengine-kits",
  repository: `${registryConfig.owner}/${registryConfig.repository}`,
  branch: registryConfig.requestedRef,
  status: "registry-backed",
  promotion: registryConfig.promotion,
  domains: domainMap,
  bundles: bundleMap,
  manifests: kits
};

const distributedKits = kits.map((manifest) => ({
  ...manifest,
  source: {
    registryId: registryConfig.id,
    owner: registryConfig.owner,
    repository: registryConfig.repository,
    requestedRef: registryConfig.requestedRef,
    resolvedCommit: registryConfig.resolvedCommit,
    path: manifest.entry
  },
  lineage: {
    source: manifest.source,
    promotion: manifest.promotion
  }
}));

const repositoryRegistry = {
  ...registryConfig,
  registryId: registryConfig.id,
  trusted: true,
  kits: distributedKits,
  domains,
  bundles
};

const statusCounts = {};
for (const manifest of kits) statusCounts[manifest.status] = (statusCounts[manifest.status] ?? 0) + 1;
const stageCounts = {};
for (const stage of ["inventoried", "sourceMapped", "protoValidated", "candidate", "official", "deprecated", "archived", "blocked"]) {
  stageCounts[stage] = kits.filter((manifest) => manifest.promotion.stages?.[stage]).length;
}
const progress = {
  baselineTotal: baseline.length,
  baselineResolved: baseline.filter((manifest) => resolvedStatuses.has(manifest.status)).length,
  baselineRemaining: baseline.filter((manifest) => !resolvedStatuses.has(manifest.status)).length,
  official: statusCounts.official ?? 0,
  candidate: statusCounts.candidate ?? 0,
  scaffolded: statusCounts.scaffolded ?? 0,
  placeholder: statusCounts["migration-placeholder"] ?? 0,
  deprecated: statusCounts.deprecated ?? 0,
  archived: statusCounts.archived ?? 0,
  blocked: stageCounts.blocked,
  approvedAdditionsTotal: additions.length,
  approvedAdditionsResolved: additions.filter((manifest) => resolvedStatuses.has(manifest.status)).length,
  activeCapability: registryConfig.promotion.activeCapability,
  stages: stageCounts
};

const generatedModule = `// Generated by scripts/build-catalog.mjs. Do not edit.\nexport const GENERATED_KIT_MANIFESTS = Object.freeze(${js(kits)});\nexport const GENERATED_DOMAIN_MANIFESTS = Object.freeze(${js(domains)});\nexport const GENERATED_BUNDLE_MANIFESTS = Object.freeze(${js(bundles)});\nexport const GENERATED_KIT_CATALOG = Object.freeze(${js(catalog)});\nexport const GENERATED_REPOSITORY_REGISTRY = Object.freeze(${js(repositoryRegistry)});\nexport const GENERATED_KIT_PROGRESS = Object.freeze(${js(progress)});\n`;
fs.writeFileSync(path.join(root, "installer/generated-catalog.js"), generatedModule);

const factories = kits.filter((manifest) => manifest.realBehavior && exists(manifest.entry));
const factoryImports = factories.map((manifest, index) => `import { ${manifest.factory} as factory${index} } from ${JSON.stringify(moduleImportPath(manifest.entry))};`);
const factoryEntries = factories.map((manifest, index) => `  ${JSON.stringify(manifest.id)}: factory${index}`);
fs.writeFileSync(path.join(root, "installer/generated-factories.js"), `${factoryImports.join("\n")}\n\nexport const GENERATED_KIT_FACTORIES = Object.freeze({\n${factoryEntries.join(",\n")}\n});\n`);

writeJson("kit-catalog.json", catalog);
writeJson("domain-catalog.json", { status: "registry-backed", domains });
writeJson("bundle-catalog.json", { status: "registry-backed", bundles });
writeJson("nexusengine.registry.json", repositoryRegistry);
writeJson("promotion-ledger.json", {
  schemaVersion: "nexusengine.promotion-ledger.v1",
  generatedFrom: "manifests/kits",
  progress,
  entries: kits.map((manifest) => ({ id: manifest.id, status: manifest.status, ...manifest.promotion }))
});
writeJson("parity/parity-status.json", {
  status: "registry-backed",
  activeCapability: progress.activeCapability,
  baselineCount: progress.baselineTotal,
  approvedAdditions: { total: progress.approvedAdditionsTotal, resolved: progress.approvedAdditionsResolved },
  kits: Object.fromEntries(kits.map((manifest) => [manifest.id, {
    status: manifest.status,
    target: manifest.entry.replace(/^\.\//, "").replace(/\/index\.js$/, ""),
    realBehavior: manifest.realBehavior,
    sourceCommit: manifest.source?.resolvedCommit ?? null,
    next: manifest.promotion.blocker ?? "keep all stable gates green"
  }]))
});

const ledgerLines = [
  "# Promotion Ledger",
  "",
  `Baseline resolved: ${progress.baselineResolved} / ${progress.baselineTotal}`,
  `Baseline remaining: ${progress.baselineRemaining}`,
  `Approved additions: ${progress.approvedAdditionsResolved} / ${progress.approvedAdditionsTotal}`,
  `Active capability: ${progress.activeCapability}`,
  "",
  "| Kit | Status | Resolved | Blocker |",
  "|---|---|---:|---|",
  ...kits.map((manifest) => `| ${manifest.id} | ${manifest.status} | ${manifest.promotion.resolved ? "yes" : "no"} | ${manifest.promotion.blocker ?? ""} |`),
  ""
];
fs.writeFileSync(path.join(root, "PROMOTION-LEDGER.md"), ledgerLines.join("\n"));

for (const manifest of kits) {
  if (!exists(manifest.entry)) continue;
  const mirrorPath = path.join(root, manifest.entry.replace(/^\.\//, "").replace(/index\.js$/, "kit.json"));
  fs.writeFileSync(mirrorPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const cdnLines = kits.map((manifest) => `${manifest.id} ${manifest.module?.browser ?? "unavailable"}`);
fs.writeFileSync(path.join(root, "docs/CDN-INDEX.txt"), `${cdnLines.join("\n")}\n`);

console.log("registry catalogs generated", {
  kits: kits.length,
  baseline: baseline.length,
  additions: additions.length,
  domains: domains.length,
  bundles: bundles.length,
  factories: factories.length,
  progress
});
