import { defineDomainServiceKit, defineEvent, defineResource } from "nexusengine";

export const KIT_REGISTRY_DOMAIN_KIT_VERSION = "1.0.0";
export const REPOSITORY_REGISTRY_SCHEMA_VERSION = "nexusengine.repository-registry.v1";
export const TRUSTED_REGISTRY_OWNERS = Object.freeze([
  "LuminaryLabs-Dev",
  "LuminaryLabs-Agents",
  "LuminaryLabs-Publish"
]);

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values) => [...new Set(values)];

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
  const words = slug(value).split(/[-:.]+/).filter(Boolean);
  return words.map((word, index) => index === 0 ? word : word[0].toUpperCase() + word.slice(1)).join("");
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
  const domainPath = String(input.domainPath ?? `n:${domain}`);
  return {
    id,
    version: String(input.version ?? "0.0.0"),
    status: String(input.status ?? input.stability ?? "experimental"),
    kind: String(input.kind ?? input.type ?? "domain-service-kit"),
    domain,
    parentDomain: input.parentDomain == null ? null : String(input.parentDomain),
    scope: String(input.scope ?? "feature-domain"),
    extendsBase: String(input.extendsBase ?? "DomainServiceKit"),
    ownsLoop: Boolean(input.ownsLoop),
    domainPath,
    parentDomainPath: input.parentDomainPath == null ? input.parentDomain == null ? null : `n:${slug(input.parentDomain)}` : String(input.parentDomainPath),
    apiName: input.apiName == null ? apiNameFor(domain) : String(input.apiName),
    factory: input.factory == null ? null : String(input.factory),
    entry: input.entry == null ? null : String(input.entry),
    packageExport: input.packageExport == null ? null : String(input.packageExport),
    module: {
      package: input.module?.package == null ? input.path == null ? null : String(input.path) : String(input.module.package),
      node: input.module?.node == null ? null : String(input.module.node),
      browser: input.module?.browser == null ? input.moduleUrl == null ? null : String(input.moduleUrl) : String(input.module.browser)
    },
    integrity: input.integrity == null ? null : String(input.integrity),
    realBehavior: Boolean(input.realBehavior),
    environments: unique(asList(input.environments ?? ["node", "browser"]).map(String)),
    requires: unique(asList(input.requires).map(String)),
    provides: unique(asList(input.provides).map(String)),
    composes: unique(asList(input.composes ?? input.children).map(String)),
    children: unique(asList(input.children ?? input.composes).map(String)),
    category: String(input.category ?? input.metadata?.category ?? domain),
    label: String(input.label ?? input.metadata?.label ?? id),
    subtitle: String(input.subtitle ?? input.metadata?.purpose ?? input.kind ?? input.type ?? "Domain Service Kit"),
    exportPath: input.exportPath == null ? null : String(input.exportPath),
    sourcePath: input.sourcePath == null ? null : String(input.sourcePath),
    testPaths: unique(asList(input.testPaths).map(String)),
    resources: unique(asList(input.resources).map(String)),
    events: unique(asList(input.events).map(String)),
    publicApi: unique(asList(input.publicApi).map(String)),
    descriptors: unique(asList(input.descriptors).map(String)),
    rendererBoundary: {
      outputsDescriptors: false,
      ownsDom: false,
      ownsCanvas: false,
      ownsThreeObjects: false,
      ...(input.rendererBoundary ?? {})
    },
    snapshot: {
      supportsSnapshot: false,
      supportsReset: false,
      supportsLoadSnapshot: false,
      ...(input.snapshot ?? {})
    },
    performance: {
      scalesWith: [],
      telemetry: [],
      degradationModes: [],
      ...(input.performance ?? {})
    },
    source: normalizeSource(input.source, source),
    lineage: clone(input.lineage ?? {}),
    proof: clone(input.proof ?? {}),
    runtime: clone(input.runtime ?? {}),
    promotion: clone(input.promotion ?? {}),
    metadata: clone(input.metadata ?? {})
  };
}

function normalizeDomainManifest(input = {}) {
  const id = stableId(input.id, "Domain manifest");
  return {
    id,
    label: String(input.label ?? id),
    kind: String(input.kind ?? "runtime-domain"),
    status: String(input.status ?? "candidate"),
    domainPath: String(input.domainPath ?? `n:${slug(id)}`),
    entry: input.entry == null ? null : String(input.entry),
    kits: unique(asList(input.kits).map(String)),
    metadata: clone(input.metadata ?? {})
  };
}

function normalizeBundleManifest(input = {}) {
  const id = stableId(input.id, "Bundle manifest");
  return {
    id,
    label: String(input.label ?? id),
    status: String(input.status ?? "candidate"),
    entry: input.entry == null ? null : String(input.entry),
    domains: unique(asList(input.domains).map(String)),
    kits: unique(asList(input.kits).map(String)),
    bundles: unique(asList(input.bundles).map(String)),
    metadata: clone(input.metadata ?? {})
  };
}

export function normalizeRepositoryRegistry(input = {}, options = {}) {
  const owner = stableId(input.owner ?? options.owner, "Repository registry owner");
  const repository = stableId(input.repository ?? options.repository, "Repository registry repository");
  const id = stableId(input.id ?? `${owner}/${repository}`, "Repository registry");
  const source = {
    registryId: id,
    owner,
    repository,
    requestedRef: String(input.requestedRef ?? input.ref ?? options.requestedRef ?? "main"),
    resolvedCommit: input.resolvedCommit == null ? options.resolvedCommit ?? null : String(input.resolvedCommit)
  };
  return {
    schemaVersion: String(input.schemaVersion ?? REPOSITORY_REGISTRY_SCHEMA_VERSION),
    id,
    owner,
    repository,
    requestedRef: source.requestedRef,
    resolvedCommit: source.resolvedCommit,
    trusted: Boolean(input.trusted ?? options.trusted ?? TRUSTED_REGISTRY_OWNERS.includes(owner)),
    engineCompatibility: clone(input.engineCompatibility ?? {}),
    kits: asList(input.kits).map((manifest) => normalizeKitManifest(manifest, source)),
    domains: asList(input.domains).map(normalizeDomainManifest),
    bundles: asList(input.bundles).map(normalizeBundleManifest),
    metadata: clone(input.metadata ?? {})
  };
}

function duplicateValues(values) {
  const seen = new Set();
  return unique(values.filter((value) => seen.has(value) || !seen.add(value)));
}

export function validateKitManifest(input = {}) {
  const errors = [];
  let manifest = null;
  try {
    manifest = normalizeKitManifest(input);
  } catch (error) {
    errors.push(error.message);
  }
  if (manifest) {
    if (!manifest.domainPath.startsWith("n:")) errors.push("manifest.domainPath must start with n:");
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(manifest.apiName)) errors.push("manifest.apiName must be a JavaScript identifier");
    if (manifest.rendererBoundary.ownsDom || manifest.rendererBoundary.ownsCanvas || manifest.rendererBoundary.ownsThreeObjects) {
      if (!/adapter|presentation|renderer/.test(manifest.kind)) errors.push("runtime domain manifests cannot own host renderer objects");
    }
  }
  return { ok: errors.length === 0, errors, manifest };
}

export function validateRepositoryRegistry(input = {}, options = {}) {
  const errors = [];
  let registry = null;
  try {
    registry = normalizeRepositoryRegistry(input, options);
  } catch (error) {
    errors.push(error.message);
  }
  if (registry) {
    if (registry.schemaVersion !== REPOSITORY_REGISTRY_SCHEMA_VERSION) errors.push(`unsupported registry schema ${registry.schemaVersion}`);
    if ((options.requirePinned ?? false) && !/^[a-f0-9]{40}$/i.test(registry.resolvedCommit ?? "")) errors.push("registry.resolvedCommit must be a full commit SHA");
    for (const manifest of registry.kits) errors.push(...validateKitManifest(manifest).errors.map((error) => `${manifest.id}: ${error}`));
    for (const field of ["id", "domainPath", "apiName"]) {
      const duplicates = duplicateValues(registry.kits.map((manifest) => manifest[field]).filter(Boolean));
      for (const duplicate of duplicates) errors.push(`duplicate kit ${field}: ${duplicate}`);
    }
    for (const duplicate of duplicateValues(registry.domains.map((domain) => domain.id))) errors.push(`duplicate domain id: ${duplicate}`);
    for (const duplicate of duplicateValues(registry.bundles.map((bundle) => bundle.id))) errors.push(`duplicate bundle id: ${duplicate}`);
  }
  return { ok: errors.length === 0, errors, registry };
}

export function createRepositoryRegistry(options = {}) {
  const report = validateRepositoryRegistry(options, { requirePinned: options.requirePinned ?? false });
  if (!report.ok) throw new TypeError(`Invalid repository registry: ${report.errors.join("; ")}`);
  return report.registry;
}

function createState(config = {}) {
  return {
    version: KIT_REGISTRY_DOMAIN_KIT_VERSION,
    status: "ready",
    registries: {},
    registryOrder: [],
    kits: {},
    kitOrder: [],
    domains: {},
    bundles: {},
    validations: [],
    collisions: [],
    revision: 0,
    lastReason: "initialized",
    trustedOwners: unique(asList(config.trustedOwners ?? TRUSTED_REGISTRY_OWNERS).map(String))
  };
}

function indexState(state) {
  const indexes = { byDomain: {}, byDomainPath: {}, byApiName: {}, byProvides: {}, byRequires: {}, byRegistry: {}, byStatus: {} };
  for (const manifest of Object.values(state.kits)) {
    indexes.byDomain[manifest.domain] = [...(indexes.byDomain[manifest.domain] ?? []), manifest.id];
    indexes.byDomainPath[manifest.domainPath] = manifest.id;
    if (manifest.apiName) indexes.byApiName[manifest.apiName] = manifest.id;
    for (const token of manifest.provides) indexes.byProvides[token] = [...(indexes.byProvides[token] ?? []), manifest.id];
    for (const token of manifest.requires) indexes.byRequires[token] = [...(indexes.byRequires[token] ?? []), manifest.id];
    if (manifest.source.registryId) indexes.byRegistry[manifest.source.registryId] = [...(indexes.byRegistry[manifest.source.registryId] ?? []), manifest.id];
    indexes.byStatus[manifest.status] = [...(indexes.byStatus[manifest.status] ?? []), manifest.id];
  }
  return indexes;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertNoCollisions(state, registry) {
  const indexes = indexState(state);
  for (const manifest of registry.kits) {
    const existing = state.kits[manifest.id];
    if (existing && !sameValue(existing, manifest)) throw new TypeError(`kit id collision: ${manifest.id}`);
    const pathOwner = indexes.byDomainPath[manifest.domainPath];
    if (pathOwner && pathOwner !== manifest.id) throw new TypeError(`domain path collision: ${manifest.domainPath}`);
    const apiOwner = manifest.apiName ? indexes.byApiName[manifest.apiName] : null;
    if (apiOwner && apiOwner !== manifest.id) throw new TypeError(`api name collision: ${manifest.apiName}`);
  }
  for (const domain of registry.domains) {
    if (state.domains[domain.id] && !sameValue(state.domains[domain.id], domain)) throw new TypeError(`domain id collision: ${domain.id}`);
  }
  for (const bundle of registry.bundles) {
    if (state.bundles[bundle.id] && !sameValue(state.bundles[bundle.id], bundle)) throw new TypeError(`bundle id collision: ${bundle.id}`);
  }
}

function addRegistryToState(state, registry) {
  assertNoCollisions(state, registry);
  if (state.registries[registry.id] && sameValue(state.registries[registry.id], registry)) return state;
  if (state.registries[registry.id]) throw new TypeError(`registry id collision: ${registry.id}`);
  const next = clone(state);
  next.registries[registry.id] = registry;
  next.registryOrder = [registry.id, ...next.registryOrder.filter((id) => id !== registry.id)];
  for (const manifest of registry.kits) {
    next.kits[manifest.id] = manifest;
    if (!next.kitOrder.includes(manifest.id)) next.kitOrder.push(manifest.id);
  }
  for (const domain of registry.domains) next.domains[domain.id] = domain;
  for (const bundle of registry.bundles) next.bundles[bundle.id] = bundle;
  next.revision += 1;
  next.lastReason = "registry-registered";
  return next;
}

function replaceRegistryInState(state, registry, config = {}) {
  let next = createState({ ...config, trustedOwners: state.trustedOwners });
  const order = state.registryOrder.filter((id) => id !== registry.id).map((id) => state.registries[id]);
  for (const retained of order) next = addRegistryToState(next, retained);
  next = addRegistryToState(next, registry);
  next.validations = clone(state.validations);
  next.collisions = clone(state.collisions);
  next.revision = state.revision + 1;
  next.lastReason = "registry-updated";
  return next;
}

function restoreState(snapshot, config = {}) {
  if (!snapshot || snapshot.version !== KIT_REGISTRY_DOMAIN_KIT_VERSION || snapshot.status !== "ready") {
    throw new TypeError("Unsupported kit registry snapshot.");
  }
  let state = createState({ ...config, trustedOwners: snapshot.trustedOwners });
  for (const registryId of snapshot.registryOrder ?? []) {
    const registry = snapshot.registries?.[registryId];
    if (!registry) throw new TypeError(`Snapshot registry is missing: ${registryId}`);
    const report = validateRepositoryRegistry(registry);
    if (!report.ok) throw new TypeError(`Invalid snapshot registry ${registryId}: ${report.errors.join("; ")}`);
    state = addRegistryToState(state, report.registry);
  }
  state.validations = clone(snapshot.validations ?? []);
  state.collisions = clone(snapshot.collisions ?? []);
  state.revision = Number(snapshot.revision ?? state.revision);
  state.lastReason = String(snapshot.lastReason ?? state.lastReason);
  return state;
}

function createPureRegistry(manifests = []) {
  const local = createRepositoryRegistry({
    id: "local/kit-registry",
    owner: "local",
    repository: "kit-registry",
    requestedRef: "local",
    kits: manifests
  });
  let state = addRegistryToState(createState(), local);
  return {
    register(input) {
      const manifest = normalizeKitManifest(input, { registryId: local.id, owner: local.owner, repository: local.repository, requestedRef: "local" });
      const existing = state.kits[manifest.id];
      if (existing && !sameValue(existing, manifest)) return { ok: false, errors: [`kit id collision: ${manifest.id}`], manifest: clone(existing) };
      if (!existing) {
        const registry = { ...local, kits: [...Object.values(state.kits), manifest] };
        state = replaceRegistryInState(state, registry);
      }
      return { ok: true, manifest: clone(manifest) };
    },
    get(id) { return clone(state.kits[String(id)] ?? null); },
    list(filter = {}) {
      return Object.values(state.kits).filter((manifest) => {
        if (filter.kind && manifest.kind !== filter.kind) return false;
        if (filter.type && manifest.kind !== filter.type) return false;
        if (filter.status && manifest.status !== filter.status) return false;
        if (filter.domain && manifest.domain !== filter.domain) return false;
        if (filter.provides && !manifest.provides.includes(filter.provides)) return false;
        if (filter.requires && !manifest.requires.includes(filter.requires)) return false;
        return true;
      }).map(clone);
    },
    search(query = "", filter = {}) {
      const text = String(query).trim().toLowerCase();
      return this.list(filter).filter((manifest) => !text || [manifest.id, manifest.domain, manifest.domainPath, manifest.apiName, ...manifest.provides, ...manifest.requires].join(" ").toLowerCase().includes(text));
    },
    findByProvide(token) { return this.list({ provides: token }); },
    findByRequire(token) { return this.list({ requires: token }); },
    findCompatibleKits(id) {
      const manifest = state.kits[String(id)];
      if (!manifest) return [];
      return this.list().filter((candidate) => candidate.id !== manifest.id && candidate.provides.some((token) => manifest.requires.includes(token)));
    },
    listCategories() { return unique(this.list().map((manifest) => manifest.metadata?.category ?? manifest.domain)).sort(); },
    listDeployKits() { return this.list().filter((manifest) => /deploy/.test(manifest.kind)); },
    listDomainBoundaries() { return this.list().filter((manifest) => manifest.resources.length || manifest.descriptors.length || manifest.metadata?.boundary); },
    snapshot() { return clone(state); }
  };
}

export const createKitRegistry = createPureRegistry;

export function mergeRegistries(registries = [], options = {}) {
  let state = createState(options);
  for (const input of asList(registries)) {
    const report = validateRepositoryRegistry(input, { requirePinned: options.requirePinned ?? false });
    if (!report.ok) throw new TypeError(`Invalid repository registry: ${report.errors.join("; ")}`);
    state = addRegistryToState(state, report.registry);
  }
  return clone(state);
}

export function createKitRegistryDomainKit(config = {}) {
  const State = defineResource(config.resourceName ?? "kitRegistry.state");
  const RegistryRegistered = defineEvent("kitRegistry.registryRegistered");
  const ManifestRegistered = defineEvent("kitRegistry.manifestRegistered");
  const ManifestValidated = defineEvent("kitRegistry.manifestValidated");
  const RegistryRemoved = defineEvent("kitRegistry.registryRemoved");
  const SnapshotLoaded = defineEvent("kitRegistry.snapshotLoaded");
  const Reset = defineEvent("kitRegistry.reset");

  const initialRegistries = asList(config.registries);

  function initialState() {
    let state = createState(config);
    for (const registry of initialRegistries) {
      const report = validateRepositoryRegistry(registry, { requirePinned: config.requirePinned ?? false });
      if (!report.ok) throw new TypeError(`Invalid initial registry: ${report.errors.join("; ")}`);
      state = addRegistryToState(state, report.registry);
    }
    return state;
  }

  function createApi(world) {
    const get = () => world.getResource(State) ?? initialState();
    const set = (state) => (world.setResource(State, state), clone(state));
    const api = {
      registerRegistry(input, options = {}) {
        const report = validateRepositoryRegistry(input, { requirePinned: options.requirePinned ?? config.requirePinned ?? false });
        if (!report.ok) throw new TypeError(`Invalid repository registry: ${report.errors.join("; ")}`);
        const current = get();
        const next = addRegistryToState(current, report.registry);
        set(next);
        if (next !== current) world.emit(RegistryRegistered, { registry: clone(report.registry) });
        return clone(report.registry);
      },
      registerManifest(input, options = {}) {
        const registryId = String(options.registryId ?? "local/runtime");
        const [owner = "local", repository = "runtime"] = registryId.split("/");
        const current = get();
        const source = { registryId, owner, repository, requestedRef: options.requestedRef ?? "runtime", resolvedCommit: options.resolvedCommit ?? null };
        const manifest = normalizeKitManifest(input, source);
        const existing = current.kits[manifest.id];
        if (existing && !sameValue(existing, manifest)) throw new TypeError(`kit id collision: ${manifest.id}`);
        if (existing) return clone(existing);
        const priorRegistry = current.registries[registryId];
        const registry = createRepositoryRegistry({
          id: registryId,
          owner,
          repository,
          requestedRef: options.requestedRef ?? "runtime",
          resolvedCommit: options.resolvedCommit ?? null,
          kits: [...(priorRegistry?.kits ?? []), manifest],
          domains: priorRegistry?.domains ?? [],
          bundles: priorRegistry?.bundles ?? []
        });
        const next = priorRegistry ? replaceRegistryInState(current, registry, config) : addRegistryToState(current, registry);
        set(next);
        world.emit(ManifestRegistered, { manifest: clone(manifest) });
        return clone(manifest);
      },
      registerMany(inputs = [], options = {}) { return asList(inputs).map((input) => api.registerManifest(input, options)); },
      validateManifest(idOrManifest) {
        const manifest = typeof idOrManifest === "string" ? get().kits[idOrManifest] : idOrManifest;
        const report = manifest ? validateKitManifest(manifest) : { ok: false, errors: [`missing manifest: ${idOrManifest}`], manifest: null };
        const state = get();
        const record = { id: `kit-registry-validation-${state.validations.length + 1}`, manifestId: manifest?.id ?? String(idOrManifest), ok: report.ok, errors: report.errors };
        state.validations = [record, ...state.validations].slice(0, Number(config.validationLimit ?? 128));
        state.lastReason = report.ok ? "manifest-valid" : "manifest-invalid";
        set(state);
        world.emit(ManifestValidated, { report: clone(record) });
        return clone(record);
      },
      removeRegistry(id) {
        const registryId = String(id);
        const current = get();
        if (!current.registries[registryId]) return false;
        let next = createState({ ...config, trustedOwners: current.trustedOwners });
        for (const retainedId of current.registryOrder.filter((entry) => entry !== registryId).reverse()) next = addRegistryToState(next, current.registries[retainedId]);
        next.validations = current.validations;
        next.collisions = current.collisions;
        next.revision = current.revision + 1;
        next.lastReason = "registry-removed";
        set(next);
        world.emit(RegistryRemoved, { registryId });
        return true;
      },
      get(id) { return clone(get().kits[String(id)] ?? null); },
      getDomain(id) { return clone(get().domains[String(id)] ?? null); },
      getBundle(id) { return clone(get().bundles[String(id)] ?? null); },
      list(filter = {}) {
        return Object.values(get().kits).filter((manifest) => {
          if (filter.kind && manifest.kind !== filter.kind) return false;
          if (filter.type && manifest.kind !== filter.type) return false;
          if (filter.status && manifest.status !== filter.status) return false;
          if (filter.domain && manifest.domain !== filter.domain) return false;
          if (filter.registryId && manifest.source.registryId !== filter.registryId) return false;
          if (filter.provides && !manifest.provides.includes(filter.provides)) return false;
          if (filter.requires && !manifest.requires.includes(filter.requires)) return false;
          return true;
        }).map(clone);
      },
      search(query = "", filter = {}) {
        const text = String(query).trim().toLowerCase();
        return api.list(filter).filter((manifest) => !text || [manifest.id, manifest.domain, manifest.domainPath, manifest.apiName, ...manifest.provides, ...manifest.requires, ...manifest.composes].join(" ").toLowerCase().includes(text));
      },
      listByDomain(domain) { return api.list().filter((manifest) => manifest.domain === domain || manifest.parentDomain === domain); },
      listByScope(scope) { return api.list().filter((manifest) => manifest.scope === scope); },
      listByProvides(token) { return api.list({ provides: token }); },
      findByProvide(token) { return api.list({ provides: token }); },
      findByRequire(token) { return api.list({ requires: token }); },
      findCompatibleKits(id) {
        const manifest = api.get(id);
        if (!manifest) return [];
        return api.list().filter((candidate) => candidate.id !== manifest.id && candidate.provides.some((token) => manifest.requires.includes(token)));
      },
      listCategories() { return unique(api.list().map((manifest) => manifest.category)).sort(); },
      listDeployKits() { return api.list().filter((manifest) => /deploy/.test(manifest.kind)); },
      listDomainBoundaries() { return api.list().filter((manifest) => manifest.resources.length || manifest.descriptors.length || manifest.metadata?.boundary); },
      getManifest(id) { return api.get(id); },
      listRegistries() { return get().registryOrder.map((id) => clone(get().registries[id])); },
      getIndexes() { return clone(indexState(get())); },
      getProgress() {
        const state = get();
        const byStatus = indexState(state).byStatus;
        const resolved = ["official", "deprecated", "archived"].reduce((total, status) => total + (byStatus[status]?.length ?? 0), 0);
        return { total: state.kitOrder.length, resolved, remaining: state.kitOrder.length - resolved, statuses: Object.fromEntries(Object.entries(byStatus).map(([status, ids]) => [status, ids.length])) };
      },
      getState() { return clone(get()); },
      getSnapshot() { return clone(get()); },
      snapshot() { return clone(get()); },
      loadSnapshot(snapshot) {
        const next = restoreState(snapshot, config);
        set(next);
        world.emit(SnapshotLoaded, { revision: next.revision, registryCount: next.registryOrder.length });
        return clone(next);
      },
      reset(payload = {}) {
        const next = payload.registries ? (() => {
          let state = createState({ ...config, ...payload });
          for (const registry of payload.registries) state = addRegistryToState(state, normalizeRepositoryRegistry(registry));
          return state;
        })() : initialState();
        set(next);
        world.emit(Reset, { reason: payload.reason ?? "reset" });
        return clone(next);
      }
    };
    return api;
  }

  return defineDomainServiceKit({
    id: config.kitId ?? config.id ?? "kit-registry-domain-kit",
    domain: "kit-registry",
    domainPath: "n:registry:kits",
    parentDomainPath: "n:registry",
    apiName: "kitRegistry",
    stability: "official",
    version: KIT_REGISTRY_DOMAIN_KIT_VERSION,
    services: ["manifests", "repositories", "domains", "bundles", "search", "progress", "snapshot"],
    provides: ["registry:kits", "registry:repositories", "kit:manifest-registry", "domain:manifest-registry"],
    resources: { State },
    events: { RegistryRegistered, ManifestRegistered, ManifestValidated, RegistryRemoved, SnapshotLoaded, Reset },
    initWorld({ world }) { world.setResource(State, initialState()); },
    createApi({ world }) { return createApi(world); },
    install({ engine }) {
      engine.kitManifest = engine.n.kitRegistry;
      engine.domainManifestRegistry = engine.n.kitRegistry;
    },
    bindings: { State },
    metadata: {
      status: "official",
      parentDomain: "registry",
      scope: "control-domain",
      ownsLoop: false,
      sourceOwners: ["kit-registry", "kit-manifest-domain-kit", "domain-manifest-registry-domain-kit", "NexusEngine-Editor registry", "NexusEngine-Kits catalog"],
      boundary: "Owns serializable repository, kit, domain, and bundle metadata. Fetching, caching, module import, installation, filesystem writes, rendering, and game behavior remain outside."
    }
  });
}

export default createKitRegistryDomainKit;
