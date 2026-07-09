import {
  KIT_CATALOG,
  resolveKitManifest
} from "./kit-catalog.js";

export function createManifestRuntimeKit(manifest, config = {}) {
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
      stability: manifest.stability ?? "migration-placeholder",
      officialKitCatalog: true,
      migrationPlaceholder: manifest.stability === "migration-placeholder",
      sourceProtoKit: manifest.sourceProtoKit,
      manifest,
      config
    },
    initWorld({ engine }) {
      if (config.installMarker === false) return;
      if (!Array.isArray(engine.nexusEngineKitInstallReports)) {
        engine.nexusEngineKitInstallReports = [];
      }
      engine.nexusEngineKitInstallReports.push({
        id: manifest.id,
        domain: manifest.domain,
        stability: manifest.stability ?? "migration-placeholder",
        placeholder: manifest.stability === "migration-placeholder"
      });
    }
  };
}

export async function loadKitFactory(manifest, options = {}) {
  if (options.moduleResolver) {
    const factory = await options.moduleResolver(manifest, options);
    if (typeof factory === "function") return factory;
  }

  if (manifest.moduleUrl && options.allowDynamicImport !== false) {
    const mod = await import(manifest.moduleUrl);
    const factory = mod[manifest.factory] ?? mod.default;
    if (typeof factory === "function") return factory;
  }

  return (config = {}) => createManifestRuntimeKit(manifest, config);
}

export function loadKitManifest(kitId, catalog = KIT_CATALOG) {
  return resolveKitManifest(kitId, catalog);
}
