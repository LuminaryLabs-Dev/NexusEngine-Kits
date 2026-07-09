import {
  KIT_CATALOG,
  resolveKitManifest
} from "./kit-catalog.js";
import { TRUSTED_REGISTRY_OWNERS } from "../registry/repository-registry.js";

export function createManifestRuntimeKit(manifest, config = {}) {
  if (!manifest.realBehavior && config.allowUnresolvedRuntime !== true) {
    throw new TypeError(`NexusEngine kit ${manifest.id} is ${manifest.status ?? manifest.stability} and has no validated runtime behavior.`);
  }
  return {
    id: config.id ?? manifest.id,
    components: {},
    resources: {},
    events: {},
    systems: [],
    requires: [...(manifest.requires ?? [])],
    provides: [...(manifest.provides ?? [])],
    bindings: {},
    metadata: {
      kind: manifest.kind ?? "runtime-kit",
      domain: manifest.domain,
      stability: manifest.status ?? manifest.stability,
      officialKitCatalog: true,
      unresolvedRuntime: !manifest.realBehavior,
      source: manifest.source,
      manifest,
      config
    }
  };
}

export async function loadKitFactory(manifest, options = {}) {
  const localFactory = options.factoryRegistry?.[manifest.id] ?? options.localFactory ?? null;
  if (typeof localFactory === "function") return localFactory;
  if (!manifest.realBehavior) throw new TypeError(`NexusEngine kit ${manifest.id} has no validated runtime behavior.`);

  const owner = manifest.source?.owner;
  const trustedOwners = new Set(options.trustedOwners ?? TRUSTED_REGISTRY_OWNERS);
  const external = owner != null && !trustedOwners.has(owner);
  if (external && options.allowExternalCode !== true) {
    throw new TypeError(`External kit code is disabled for ${manifest.id}; set allowExternalCode: true with an approved moduleResolver.`);
  }
  if (!manifest.integrity) throw new TypeError(`NexusEngine kit ${manifest.id} has no verified module integrity.`);
  if (typeof options.moduleResolver !== "function") throw new TypeError(`NexusEngine kit ${manifest.id} requires an approved moduleResolver.`);

  const result = await options.moduleResolver(manifest, options);
  if (!result || result.verified !== true || result.verifiedIntegrity !== manifest.integrity || typeof result.factory !== "function") {
    throw new TypeError(`Approved moduleResolver did not return verified factory ${manifest.factory} for ${manifest.id}.`);
  }
  return result.factory;
}

export function loadKitManifest(kitId, catalog = KIT_CATALOG) {
  return resolveKitManifest(kitId, catalog);
}
