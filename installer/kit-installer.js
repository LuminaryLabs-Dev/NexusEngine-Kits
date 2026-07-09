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
import { getRebuiltKitFactory } from "./rebuilt-factories.js";

function installIntoEngine(engine, kit, options = {}) {
  if (!engine || typeof engine !== "object") {
    throw new TypeError("installIntoEngine expects a NexusEngine engine object.");
  }

  if (!engine.__nexusEngineKitsInstalled) {
    engine.__nexusEngineKitsInstalled = new Set();
  }

  if (kit.id && engine.__nexusEngineKitsInstalled.has(kit.id) && options.allowDuplicateKitIds !== true) {
    return { kit, installed: false, duplicate: true };
  }

  const installed = typeof engine.installKit === "function"
    ? engine.installKit(kit, options)
    : fallbackInstall(engine, kit);

  if (kit.id) {
    engine.__nexusEngineKitsInstalled.add(kit.id);
  }

  return { kit: installed ?? kit, installed: true, duplicate: false };
}

function fallbackInstall(engine, kit) {
  if (!Array.isArray(engine.kits)) engine.kits = [];
  engine.kits.push(kit);
  if (typeof kit.initWorld === "function") {
    kit.initWorld({ engine, world: engine.world ?? {}, kit, options: {} });
  }
  if (typeof kit.install === "function") {
    kit.install({ engine, world: engine.world ?? {}, kit, options: {} });
  }
  return kit;
}

export function createNexusEngineKitInstaller(options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  const allowedStatuses = new Set(options.allowStatuses ?? ["official"]);

  function readiness(kitId) {
    const manifest = resolveKitManifest(kitId, catalog);
    return {
      manifest,
      allowed: allowedStatuses.has(manifest.stability)
    };
  }

  async function createKit(kitId, config = {}) {
    const { manifest, allowed } = readiness(kitId);
    if (!allowed) {
      throw new TypeError(`NexusEngine kit ${kitId} has unready status ${manifest.stability}; allowed statuses: ${[...allowedStatuses].join(", ")}.`);
    }
    const rebuiltFactory = getRebuiltKitFactory(kitId);
    if (typeof rebuiltFactory === "function") return rebuiltFactory(config);
    if (manifest.realBehavior) {
      throw new TypeError(`NexusEngine kit ${kitId} is marked real but has no registered factory.`);
    }
    const factory = await loadKitFactory(manifest, { ...options, catalog });
    return factory(config);
  }

  async function installKit(engine, kitOrId, config = {}) {
    if (typeof kitOrId === "string") {
      const { manifest, allowed } = readiness(kitOrId);
      if (!allowed) {
        return {
          kit: null,
          manifest,
          installed: false,
          duplicate: false,
          skipped: true,
          reason: "status-not-allowed"
        };
      }
    }
    const kit = typeof kitOrId === "string"
      ? await createKit(kitOrId, config)
      : kitOrId;
    return { ...installIntoEngine(engine, kit, options), skipped: false, reason: null };
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
    allowedStatuses: [...allowedStatuses],
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
