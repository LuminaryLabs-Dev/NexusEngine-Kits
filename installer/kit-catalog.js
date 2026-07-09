import {
  GENERATED_BUNDLE_MANIFESTS,
  GENERATED_DOMAIN_MANIFESTS,
  GENERATED_KIT_CATALOG,
  GENERATED_KIT_MANIFESTS,
  GENERATED_KIT_PROGRESS,
  GENERATED_REPOSITORY_REGISTRY
} from "./generated-catalog.js";

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const byId = (records) => new Map(records.map((record) => [record.id, record]));

const KIT_BY_ID = byId(GENERATED_KIT_MANIFESTS);
const DOMAIN_BY_ID = byId(GENERATED_DOMAIN_MANIFESTS);
const BUNDLE_BY_ID = byId(GENERATED_BUNDLE_MANIFESTS);

export const KIT_CATALOG = GENERATED_KIT_CATALOG;
export const NEXUSENGINE_REPOSITORY_REGISTRY = GENERATED_REPOSITORY_REGISTRY;

export function createNexusEngineKitCatalog() {
  return clone(KIT_CATALOG);
}

export function listKitManifests(filter = {}, catalog = KIT_CATALOG) {
  return (catalog.manifests ?? []).filter((manifest) => {
    if (filter.status && manifest.status !== filter.status) return false;
    if (filter.stability && manifest.status !== filter.stability) return false;
    if (filter.domain && manifest.domain !== filter.domain) return false;
    if (filter.kind && manifest.kind !== filter.kind) return false;
    if (filter.realBehavior != null && manifest.realBehavior !== filter.realBehavior) return false;
    return true;
  }).map(clone);
}

export function listDomainManifests() {
  return GENERATED_DOMAIN_MANIFESTS.map(clone);
}

export function listBundleManifests() {
  return GENERATED_BUNDLE_MANIFESTS.map(clone);
}

export function listDomainIds(catalog = KIT_CATALOG) {
  return Object.keys(catalog.domains ?? {});
}

export function listKitIds(catalog = KIT_CATALOG) {
  if (Array.isArray(catalog.manifests)) return catalog.manifests.map((manifest) => manifest.id);
  return [...new Set(Object.values(catalog.domains ?? {}).flat())];
}

export function findKitDomain(kitId, catalog = KIT_CATALOG) {
  const manifest = (catalog.manifests ?? []).find((entry) => entry.id === kitId);
  if (manifest) return manifest.domain;
  for (const [domainId, kitIds] of Object.entries(catalog.domains ?? {})) {
    if (kitIds.includes(kitId)) return domainId;
  }
  return null;
}

function pascalCase(value) {
  return String(value)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function factoryNameForKit(kitId) {
  return KIT_BY_ID.get(kitId)?.factory ?? `create${pascalCase(kitId)}`;
}

export function cdnUrlForKit(kitId, options = {}) {
  const manifest = options.catalog
    ? (options.catalog.manifests ?? []).find((entry) => entry.id === kitId)
    : KIT_BY_ID.get(kitId);
  if (!manifest?.module?.browser) return null;
  const resolvedCommit = options.resolvedCommit ?? options.ref ?? null;
  if (!resolvedCommit) return manifest.module.browser;
  if (!/^[a-f0-9]{40}$/i.test(resolvedCommit) && options.allowMutableRef !== true) {
    throw new TypeError("CDN module URLs require a full immutable commit SHA.");
  }
  const repository = options.repository ?? KIT_CATALOG.repository;
  return `https://cdn.jsdelivr.net/gh/${repository}@${resolvedCommit}/${manifest.entry.replace(/^\.\//, "")}`;
}

export function resolveKitManifest(kitId, catalog = KIT_CATALOG) {
  const manifest = catalog === KIT_CATALOG
    ? KIT_BY_ID.get(kitId)
    : (catalog.manifests ?? []).find((entry) => entry.id === kitId);
  if (!manifest) throw new Error(`Unknown NexusEngine kit: ${kitId}`);
  return clone({ ...manifest, stability: manifest.status, cdn: { jsdelivr: manifest.module?.browser ?? null } });
}

function calculateProgress(catalog) {
  const additionIds = new Set(catalog.promotion?.approvedAdditionIds ?? []);
  const manifests = listKitManifests({}, catalog);
  const baseline = manifests.filter((manifest) => !additionIds.has(manifest.id));
  const additions = manifests.filter((manifest) => additionIds.has(manifest.id));
  const resolved = new Set(["official", "deprecated", "archived"]);
  const statuses = {};
  for (const manifest of manifests) statuses[manifest.status] = (statuses[manifest.status] ?? 0) + 1;
  const stages = {};
  for (const stage of ["inventoried", "sourceMapped", "protoValidated", "candidate", "official", "deprecated", "archived", "blocked"]) {
    stages[stage] = manifests.filter((manifest) => manifest.promotion?.stages?.[stage]).length;
  }
  return {
    baselineTotal: catalog.promotion?.baselineCount ?? baseline.length,
    baselineResolved: baseline.filter((manifest) => resolved.has(manifest.status)).length,
    baselineRemaining: baseline.filter((manifest) => !resolved.has(manifest.status)).length,
    official: statuses.official ?? 0,
    candidate: statuses.candidate ?? 0,
    scaffolded: statuses.scaffolded ?? 0,
    placeholder: statuses["migration-placeholder"] ?? 0,
    deprecated: statuses.deprecated ?? 0,
    archived: statuses.archived ?? 0,
    blocked: stages.blocked,
    approvedAdditionsTotal: additions.length,
    approvedAdditionsResolved: additions.filter((manifest) => resolved.has(manifest.status)).length,
    activeCapability: catalog.promotion?.activeCapability ?? null,
    stages
  };
}

export function getKitProgress(catalog = KIT_CATALOG) {
  return clone(catalog === KIT_CATALOG ? GENERATED_KIT_PROGRESS : calculateProgress(catalog));
}

export function getDomainKitIds(domainId, catalog = KIT_CATALOG) {
  const domain = catalog === KIT_CATALOG ? DOMAIN_BY_ID.get(domainId) : null;
  const kitIds = domain?.kits ?? catalog.domains?.[domainId];
  if (!kitIds) throw new Error(`Unknown NexusEngine kit domain: ${domainId}`);
  return [...kitIds];
}

export function getBundleDomainIds(bundleId, catalog = KIT_CATALOG) {
  const bundle = catalog === KIT_CATALOG ? BUNDLE_BY_ID.get(bundleId) : null;
  const domains = bundle?.domains ?? catalog.bundles?.[bundleId];
  if (!domains) throw new Error(`Unknown NexusEngine kit bundle: ${bundleId}`);
  return [...domains];
}

export function getDomainManifest(domainId) {
  return clone(DOMAIN_BY_ID.get(domainId) ?? null);
}

export function getBundleManifest(bundleId) {
  return clone(BUNDLE_BY_ID.get(bundleId) ?? null);
}
