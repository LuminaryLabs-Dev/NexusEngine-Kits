import {
  KIT_CATALOG,
  getBundleDomainIds,
  getDomainKitIds,
  resolveKitManifest
} from "./kit-catalog.js";
import { getKitFactory } from "./rebuilt-factories.js";

export function createDomainKits(domainId, config = {}, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  const allowedStatuses = new Set(options.allowStatuses ?? ["official"]);
  return getDomainKitIds(domainId, catalog).flatMap((kitId) => {
    const manifest = resolveKitManifest(kitId, catalog);
    if (!allowedStatuses.has(manifest.stability)) return [];
    const kitConfig = config[kitId] ?? config[camelKey(kitId)] ?? {};
    const factory = getKitFactory(kitId);
    if (factory) return [factory(kitConfig)];
    throw new TypeError(`NexusEngine kit ${kitId} has allowed status ${manifest.stability} but no validated generated factory.`);
  });
}

export function createBundleKits(bundleId, config = {}, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  return getBundleDomainIds(bundleId, catalog).flatMap((domainId) => (
    createDomainKits(domainId, config[domainId] ?? {}, { ...options, catalog })
  ));
}

export function createAllNexusEngineKits(config = {}, options = {}) {
  return createBundleKits("all", config, options);
}

function camelKey(value) {
  return String(value).replace(/-([a-z0-9])/g, (_, part) => part.toUpperCase());
}
