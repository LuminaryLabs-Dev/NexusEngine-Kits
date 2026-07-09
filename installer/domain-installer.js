import {
  KIT_CATALOG,
  getBundleDomainIds,
  getDomainKitIds,
  resolveKitManifest
} from "./kit-catalog.js";
import { createManifestRuntimeKit } from "./kit-manifest-loader.js";

export function createDomainKits(domainId, config = {}, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  return getDomainKitIds(domainId, catalog).map((kitId) => {
    const manifest = resolveKitManifest(kitId, catalog);
    return createManifestRuntimeKit(manifest, config[kitId] ?? config[camelKey(kitId)] ?? {});
  });
}

export function createBundleKits(bundleId, config = {}, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  return getBundleDomainIds(bundleId, catalog).flatMap((domainId) => (
    createDomainKits(domainId, config[domainId] ?? {}, { catalog })
  ));
}

export function createAllNexusRealtimeKits(config = {}, options = {}) {
  return createBundleKits("all", config, options);
}

function camelKey(value) {
  return String(value).replace(/-([a-z0-9])/g, (_, part) => part.toUpperCase());
}
