import {
  KIT_CATALOG,
  getBundleDomainIds,
  getDomainKitIds,
  resolveKitManifest
} from "./kit-catalog.js";
import {
  createManifestRuntimeKit,
  loadKitFactory
} from "./kit-manifest-loader.js";

function installIntoEngine(engine, kit, options = {}) {
  if (!engine || typeof engine !== "object") {
    throw new TypeError("installIntoEngine expects a NexusRealtime engine object.");
  }

  if (!engine.__nexusRealtimeKitsInstalled) {
    engine.__nexusRealtimeKitsInstalled = new Set();
  }

  if (kit.id && engine.__nexusRealtimeKitsInstalled.has(kit.id) && options.allowDuplicateKitIds !== true) {
    return { kit, installed: false, duplicate: true };
  }

  const installed = typeof engine.installKit === "function"
    ? engine.installKit(kit, options)
    : fallbackInstall(engine, kit);

  if (kit.id) {
    engine.__nexusRealtimeKitsInstalled.add(kit.id);
  }

  return { kit: installed ?? kit, installed: true, duplicate: false };
}

function fallbackInstall(engine, kit) {
  if (!Array.isArray(engine.kits)) engine.kits = [];
  engine.kits.push(kit);
  if (typeof kit.initWorld === "function" && engine.world) {
    kit.initWorld({ engine, world: engine.world, kit, options: {} });
  }
  return kit;
}

export function createNexusRealtimeKitInstaller(options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;

  async function createKit(kitId, config = {}) {
    const manifest = resolveKitManifest(kitId, catalog);
    const factory = await loadKitFactory(manifest, { ...options, catalog });
    return factory(config);
  }

  async function installKit(engine, kitOrId, config = {}) {
    const kit = typeof kitOrId === "string"
      ? await createKit(kitOrId, config)
      : kitOrId;
    return installIntoEngine(engine, kit, options);
  }

  async function installDomain(engine, domainId, config = {}) {
    const results = [];
    for (const kitId of getDomainKitIds(domainId, catalog)) {
      results.push(await installKit(engine, kitId, config[kitId] ?? {}));
    }
    return { domainId, results };
  }

  async function installBundle(engine, bundleId, config = {}) {
    const results = [];
    for (const domainId of getBundleDomainIds(bundleId, catalog)) {
      results.push(await installDomain(engine, domainId, config[domainId] ?? {}));
    }
    return { bundleId, results };
  }

  async function installAll(engine, config = {}) {
    return installBundle(engine, "all", config);
  }

  return {
    catalog,
    createKit,
    installKit,
    installDomain,
    installBundle,
    installAll,
    resolveKit(kitId) {
      return resolveKitManifest(kitId, catalog);
    },
    createPlaceholderKit(kitId, config = {}) {
      return createManifestRuntimeKit(resolveKitManifest(kitId, catalog), config);
    }
  };
}
