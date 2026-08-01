export const INTERNAL_REPOSITORY_REGISTRY_SCHEMA = "nexusengine-kits.internal-registry/1";
export const TRUSTED_REGISTRY_OWNERS = Object.freeze([
  "LuminaryLabs-Dev",
  "LuminaryLabs-Agents",
  "LuminaryLabs-Publish"
]);

const clone = (value) => value == null ? value : structuredClone(value);
const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values) => [...new Set(values)];
const FULL_SHA = /^[a-f0-9]{40}$/i;

function stableId(value, label) {
  const id = String(value ?? "").trim();
  if (!id) throw new TypeError(`${label} requires a stable id.`);
  return id;
}

function slug(value, fallback = "kit") {
  return String(value ?? fallback)
    .trim()
    .replace(/^n:/, "")
    .replace(/[^a-z0-9:.-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || fallback;
}

function apiNameFor(value) {
  return slug(value).split(/[-:.]+/).filter(Boolean)
    .map((word, index) => index === 0 ? word : word[0].toUpperCase() + word.slice(1))
    .join("");
}

function normalizeSource(source = {}, fallback = {}) {
  return {
    registryId: source.registryId == null ? fallback.registryId ?? null : String(source.registryId),
    owner: source.owner == null ? fallback.owner ?? null : String(source.owner),
    repository: source.repository == null ? fallback.repository ?? null : String(source.repository),
    requestedRef: source.requestedRef == null ? fallback.requestedRef ?? null : String(source.requestedRef),
    resolvedCommit: source.resolvedCommit == null ? fallback.resolvedCommit ?? null : String(source.resolvedCommit),
    path: source.path == null ? null : String(source.path),
    url: source.url == null ? null : String(source.url)
  };
}

export function normalizeKitManifest(input = {}, source = {}) {
  const id = stableId(input.id, "Kit manifest");
  const domain = slug(input.domain ?? id.replace(/-(domain-)?kit$/, ""));
  return {
    ...clone(input),
    id,
    version: String(input.version ?? "0.0.0"),
    status: String(input.status ?? input.stability ?? "experimental"),
    kind: String(input.kind ?? input.type ?? "domain-service-kit"),
    domain,
    domainPath: String(input.domainPath ?? `n:${domain}`),
    parentDomainPath: input.parentDomainPath == null ? null : String(input.parentDomainPath),
    apiName: input.apiName == null ? apiNameFor(domain) : String(input.apiName),
    factory: input.factory == null ? null : String(input.factory),
    entry: input.entry == null ? null : String(input.entry),
    packageExport: input.packageExport == null ? null : String(input.packageExport),
    module: clone(input.module ?? {}),
    realBehavior: Boolean(input.realBehavior),
    environments: unique(asList(input.environments ?? ["node", "browser"]).map(String)),
    requires: unique(asList(input.requires).map(String)),
    provides: unique(asList(input.provides).map(String)),
    composes: unique(asList(input.composes ?? input.children).map(String)),
    children: unique(asList(input.children ?? input.composes).map(String)),
    source: normalizeSource(input.source, source)
  };
}

function normalizeDomainManifest(input = {}) {
  const id = stableId(input.id, "Domain manifest");
  return {
    ...clone(input),
    id,
    label: String(input.label ?? id),
    status: String(input.status ?? "candidate"),
    domainPath: String(input.domainPath ?? `n:${slug(id)}`),
    kits: unique(asList(input.kits).map(String))
  };
}

function normalizeBundleManifest(input = {}) {
  const id = stableId(input.id, "Bundle manifest");
  return {
    ...clone(input),
    id,
    label: String(input.label ?? id),
    status: String(input.status ?? "candidate"),
    domains: unique(asList(input.domains).map(String)),
    kits: unique(asList(input.kits).map(String)),
    bundles: unique(asList(input.bundles).map(String))
  };
}

export function normalizeInternalRepositoryRegistry(input = {}, options = {}) {
  const owner = stableId(input.owner ?? options.owner, "Repository registry owner");
  const repository = stableId(input.repository ?? options.repository, "Repository registry repository");
  const id = stableId(input.id ?? `${owner}/${repository}`, "Repository registry");
  const requestedRef = String(input.requestedRef ?? input.ref ?? options.requestedRef ?? "main");
  const resolvedCommit = input.resolvedCommit == null ? options.resolvedCommit ?? null : String(input.resolvedCommit);
  const source = { registryId: id, owner, repository, requestedRef, resolvedCommit };
  return {
    schemaVersion: INTERNAL_REPOSITORY_REGISTRY_SCHEMA,
    id,
    owner,
    repository,
    requestedRef,
    resolvedCommit,
    trusted: Boolean(input.trusted ?? options.trusted ?? TRUSTED_REGISTRY_OWNERS.includes(owner)),
    engineCompatibility: clone(input.engineCompatibility ?? {}),
    kits: asList(input.kits).map((manifest) => normalizeKitManifest(manifest, source)),
    domains: asList(input.domains).map(normalizeDomainManifest),
    bundles: asList(input.bundles).map(normalizeBundleManifest),
    metadata: clone(input.metadata ?? {})
  };
}

function duplicates(values) {
  const seen = new Set();
  return unique(values.filter((value) => seen.has(value) || !seen.add(value)));
}

export function validateInternalRepositoryRegistry(input = {}, options = {}) {
  const errors = [];
  let registry = null;
  try {
    registry = normalizeInternalRepositoryRegistry(input, options);
  } catch (error) {
    errors.push(error.message);
  }
  if (registry) {
    if (options.requirePinned && !FULL_SHA.test(registry.resolvedCommit ?? "")) {
      errors.push("registry.resolvedCommit must be a full commit SHA");
    }
    for (const manifest of registry.kits) {
      if (!manifest.domainPath.startsWith("n:")) errors.push(`${manifest.id}: domainPath must start with n:`);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(manifest.apiName)) errors.push(`${manifest.id}: invalid apiName`);
    }
    for (const field of ["id", "domainPath", "apiName"]) {
      for (const value of duplicates(registry.kits.map((manifest) => manifest[field]).filter(Boolean))) {
        errors.push(`duplicate kit ${field}: ${value}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, registry };
}

export function createInternalRepositoryRegistry(input = {}) {
  const report = validateInternalRepositoryRegistry(input, { requirePinned: input.requirePinned ?? false });
  if (!report.ok) throw new TypeError(`Invalid internal repository registry: ${report.errors.join("; ")}`);
  return report.registry;
}

export function hydrateInternalRepositoryRegistry(input, resolvedCommit) {
  if (!FULL_SHA.test(resolvedCommit ?? "")) {
    throw new TypeError("Internal repository registry hydration requires a full immutable commit SHA.");
  }
  const raw = clone(input);
  raw.resolvedCommit = resolvedCommit.toLowerCase();
  raw.kits = asList(raw.kits).map((manifest) => ({
    ...manifest,
    module: {
      ...(manifest.module ?? {}),
      browser: manifest.module?.browser?.replaceAll("{resolvedCommit}", raw.resolvedCommit) ?? null
    },
    source: {
      ...(manifest.source ?? {}),
      registryId: raw.id,
      owner: raw.owner,
      repository: raw.repository,
      requestedRef: raw.requestedRef,
      resolvedCommit: raw.resolvedCommit,
      path: manifest.source?.path ?? manifest.entry ?? null
    }
  }));
  return createInternalRepositoryRegistry(raw);
}

export function assertInternalRegistryTrust(registry, options = {}) {
  if (!FULL_SHA.test(registry?.resolvedCommit ?? "") && options.allowLocalTemplate !== true) {
    throw new TypeError(`Registry ${registry?.id ?? "source"} requires a full immutable commit SHA.`);
  }
  if (registry?.owner && !(options.trustedOwners ?? TRUSTED_REGISTRY_OWNERS).includes(registry.owner)) {
    const pins = options.externalRegistries ?? options.allowedExternalRegistries ?? {};
    const expected = pins instanceof Map ? pins.get(registry.id) : pins[registry.id];
    if (!FULL_SHA.test(expected ?? "")) {
      throw new TypeError(`External registry ${registry.id} requires an explicit full-SHA pin in externalRegistries.`);
    }
    if (expected.toLowerCase() !== registry.resolvedCommit.toLowerCase()) {
      throw new TypeError(`External registry ${registry.id} resolved to ${registry.resolvedCommit}, not approved pin ${expected}.`);
    }
  }
  return true;
}
