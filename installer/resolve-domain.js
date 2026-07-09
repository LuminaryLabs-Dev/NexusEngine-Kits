import { KIT_CATALOG, getDomainKitIds } from "./kit-catalog.js";

export function resolveDomain(domainId, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  return {
    id: domainId,
    kits: getDomainKitIds(domainId, catalog)
  };
}
