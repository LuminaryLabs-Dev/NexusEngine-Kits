import { createInstallPlan } from "./composition.js";
import { isImmutableCommit } from "./repository-registry.js";

export const NEXUSENGINE_KITS_LOCK_SCHEMA_VERSION = "nexusengine.kits-lock.v1";

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export function createNexusEngineKitsLockfile({ registries = [], selection = {}, plan } = {}) {
  const registryList = Array.isArray(registries) ? registries : [registries];
  for (const registry of registryList) {
    if (!isImmutableCommit(registry.resolvedCommit)) throw new TypeError(`Lockfile registry ${registry.id} requires a full commit SHA.`);
  }
  if (!plan?.ok) throw new TypeError("A lockfile requires a successful install plan.");
  return {
    schemaVersion: NEXUSENGINE_KITS_LOCK_SCHEMA_VERSION,
    registries: registryList.map((registry) => ({
      id: registry.id,
      owner: registry.owner,
      repository: registry.repository,
      requestedRef: registry.requestedRef,
      resolvedCommit: registry.resolvedCommit
    })),
    selection: clone(selection),
    resolution: {
      installOrder: [...plan.installOrder],
      coreDependencies: [...plan.coreDependencies],
      kits: plan.manifests.map((manifest) => ({
        id: manifest.id,
        version: manifest.version,
        registryId: manifest.source.registryId,
        resolvedCommit: manifest.source.resolvedCommit,
        integrity: manifest.integrity,
        module: clone(manifest.module)
      }))
    }
  };
}

export function validateNexusEngineKitsLockfile(lockfile, options = {}) {
  const errors = [];
  if (lockfile?.schemaVersion !== NEXUSENGINE_KITS_LOCK_SCHEMA_VERSION) errors.push("unsupported lockfile schemaVersion");
  if (!Array.isArray(lockfile?.registries)) errors.push("lockfile.registries must be an array");
  if (!Array.isArray(lockfile?.resolution?.installOrder)) errors.push("lockfile.resolution.installOrder must be an array");
  if (!Array.isArray(lockfile?.resolution?.kits)) errors.push("lockfile.resolution.kits must be an array");
  for (const registry of lockfile?.registries ?? []) {
    if (!isImmutableCommit(registry.resolvedCommit)) errors.push(`registry ${registry.id} is not pinned`);
  }
  const kitIds = new Set();
  for (const kit of lockfile?.resolution?.kits ?? []) {
    if (kitIds.has(kit.id)) errors.push(`duplicate locked kit ${kit.id}`);
    kitIds.add(kit.id);
    if (!kit.integrity && options.requireIntegrity !== false) errors.push(`locked kit ${kit.id} has no integrity`);
  }
  return { ok: errors.length === 0, errors, lockfile: clone(lockfile) };
}

export function createInstallPlanFromLockfile(lockfile, registry, options = {}) {
  const report = validateNexusEngineKitsLockfile(lockfile);
  if (!report.ok) throw new TypeError(`Invalid NexusEngine Kits lockfile: ${report.errors.join("; ")}`);
  const lockedRegistry = lockfile.registries.find((entry) => entry.id === registry.id);
  if (!lockedRegistry || lockedRegistry.resolvedCommit !== registry.resolvedCommit) throw new TypeError(`Lockfile registry commit does not match ${registry.id}.`);
  const plan = createInstallPlan({ kits: lockfile.resolution.installOrder }, { ...options, registry, allowStatuses: options.allowStatuses ?? ["official", "candidate", "experimental"] });
  if (!plan.ok) return plan;
  for (const locked of lockfile.resolution.kits) {
    const manifest = plan.manifests.find((entry) => entry.id === locked.id);
    if (!manifest) throw new TypeError(`Locked kit is missing from registry: ${locked.id}`);
    if (manifest.integrity !== locked.integrity) throw new TypeError(`Locked integrity mismatch for ${locked.id}.`);
  }
  return { ...plan, fromLockfile: true };
}
