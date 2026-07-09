import { NEXUSENGINE_REPOSITORY_REGISTRY } from "../installer/kit-catalog.js";
import { createRepositoryRegistry } from "./repository-registry.js";

const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values) => [...new Set(values)];

function normalizeSelection(selection = {}) {
  if (typeof selection === "string") return { kits: [selection], domains: [], bundles: [] };
  if (Array.isArray(selection)) return { kits: selection.map(String), domains: [], bundles: [] };
  return {
    kits: asList(selection.kits ?? selection.kit).map(String),
    domains: asList(selection.domains ?? selection.domain).map(String),
    bundles: asList(selection.bundles ?? selection.bundle).map(String)
  };
}

export function collectNexusEngineProviders(engine, configured = []) {
  const providers = new Set(asList(configured).map(String));
  for (const kit of engine?.kits ?? []) {
    for (const token of kit.provides ?? []) providers.add(String(token));
    if (kit.domainPath) providers.add(String(kit.domainPath));
    if (kit.metadata?.domainPath) providers.add(String(kit.metadata.domainPath));
    if (kit.metadata?.apiPath) providers.add(String(kit.metadata.apiPath));
  }
  return [...providers].sort();
}

function normalizeRegistry(input) {
  return createRepositoryRegistry(input ?? NEXUSENGINE_REPOSITORY_REGISTRY);
}

export function createInstallPlan(selection = {}, options = {}) {
  const registry = normalizeRegistry(options.registry);
  const normalized = normalizeSelection(selection);
  const byId = new Map(registry.kits.map((manifest) => [manifest.id, manifest]));
  const domainById = new Map(registry.domains.map((manifest) => [manifest.id, manifest]));
  const bundleById = new Map(registry.bundles.map((manifest) => [manifest.id, manifest]));
  const providers = new Map();
  for (const manifest of registry.kits) {
    for (const token of manifest.provides) providers.set(token, [...(providers.get(token) ?? []), manifest.id].sort());
  }

  const allowedStatuses = new Set(options.allowStatuses ?? ["official"]);
  const selected = new Set(normalized.kits);
  const expanded = new Set();
  const missing = [];
  const skipped = [];
  const warnings = [];
  const coreDependencies = new Set();
  const coreProvides = new Set(collectNexusEngineProviders(options.engine, options.coreProvides));

  function includeCatalogMember(kitId, context) {
    const manifest = byId.get(kitId);
    if (!manifest) {
      missing.push({ type: "missing-kit", id: kitId, context });
      return;
    }
    if (!allowedStatuses.has(manifest.status)) {
      skipped.push({ type: "status-not-allowed", id: kitId, status: manifest.status, context });
      return;
    }
    if (!manifest.realBehavior) {
      skipped.push({ type: "unresolved-runtime", id: kitId, status: manifest.status, context });
      return;
    }
    selected.add(kitId);
  }

  for (const domainId of normalized.domains) {
    const domain = domainById.get(domainId);
    if (!domain) missing.push({ type: "missing-domain", id: domainId });
    else for (const kitId of domain.kits) includeCatalogMember(kitId, { domainId });
  }
  for (const bundleId of normalized.bundles) {
    const bundle = bundleById.get(bundleId);
    if (!bundle) {
      missing.push({ type: "missing-bundle", id: bundleId });
      continue;
    }
    for (const kitId of bundle.kits) includeCatalogMember(kitId, { bundleId });
    for (const domainId of bundle.domains) {
      const domain = domainById.get(domainId);
      if (!domain) missing.push({ type: "missing-domain", id: domainId, bundleId });
      else for (const kitId of domain.kits) includeCatalogMember(kitId, { bundleId, domainId });
    }
  }

  function include(kitId, chain = []) {
    if (expanded.has(kitId)) return;
    const manifest = byId.get(kitId);
    if (!manifest) {
      missing.push({ type: "missing-kit", id: kitId, chain });
      return;
    }
    if (!selected.has(kitId)) selected.add(kitId);
    expanded.add(kitId);
    for (const childId of manifest.composes) if (!chain.includes(childId)) include(childId, [...chain, kitId]);
    for (const token of manifest.requires) {
      if (coreProvides.has(token)) {
        coreDependencies.add(token);
        continue;
      }
      const choices = providers.get(token) ?? [];
      if (!choices.length) {
        missing.push({ type: "missing-require", id: kitId, token, chain });
        continue;
      }
      if (choices.length > 1) warnings.push({ type: "multiple-providers", token, selected: choices[0], choices });
      include(choices[0], [...chain, kitId]);
    }
  }
  for (const kitId of [...selected].sort()) include(kitId);

  const rejected = [];
  for (const kitId of [...selected].sort()) {
    const manifest = byId.get(kitId);
    if (!manifest) continue;
    if (!allowedStatuses.has(manifest.status)) rejected.push({ type: "status-not-allowed", id: kitId, status: manifest.status });
    if (!manifest.realBehavior) rejected.push({ type: "unresolved-runtime", id: kitId, status: manifest.status });
    if (!manifest.factory || !manifest.module?.node && !manifest.module?.browser && !manifest.module?.package) rejected.push({ type: "missing-module", id: kitId });
  }

  const dependencies = Object.fromEntries([...selected].map((id) => [id, new Set()]));
  for (const kitId of [...selected]) {
    const manifest = byId.get(kitId);
    if (!manifest) continue;
    for (const childId of manifest.composes) if (selected.has(childId)) dependencies[kitId].add(childId);
    for (const token of manifest.requires) {
      if (coreProvides.has(token)) continue;
      const providerId = (providers.get(token) ?? []).find((id) => selected.has(id));
      if (providerId) dependencies[kitId].add(providerId);
    }
  }

  const installOrder = [];
  const remaining = new Set([...selected].filter((id) => byId.has(id)));
  while (remaining.size) {
    const ready = [...remaining].filter((id) => [...dependencies[id]].every((dependency) => !remaining.has(dependency))).sort();
    if (!ready.length) break;
    for (const id of ready) {
      installOrder.push(id);
      remaining.delete(id);
    }
  }
  const cycles = remaining.size ? [{ kits: [...remaining].sort(), type: "dependency-cycle" }] : [];
  const issues = [...missing, ...rejected];
  const manifests = installOrder.map((id) => byId.get(id));

  return {
    id: String(options.id ?? "nexusengine-install-plan"),
    ok: issues.length === 0 && cycles.length === 0,
    registryId: registry.id,
    resolvedCommit: registry.resolvedCommit,
    selection: normalized,
    allowStatuses: [...allowedStatuses],
    installOrder,
    manifests,
    missing,
    rejected,
    skipped,
    cycles,
    warnings,
    coreDependencies: [...coreDependencies].sort(),
    resolvedSources: manifests.map((manifest) => ({
      id: manifest.id,
      registryId: manifest.source.registryId,
      owner: manifest.source.owner,
      repository: manifest.source.repository,
      resolvedCommit: manifest.source.resolvedCommit,
      integrity: manifest.integrity,
      module: manifest.module
    }))
  };
}
