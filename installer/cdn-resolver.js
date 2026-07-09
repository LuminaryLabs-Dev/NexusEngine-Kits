import {
  KIT_CATALOG,
  cdnUrlForKit,
  getBundleDomainIds,
  getDomainKitIds
} from "./kit-catalog.js";

export function createCdnResolver(options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  const repository = options.repository ?? catalog.repository;
  const ref = options.ref ?? catalog.branch ?? "main";
  const root = options.root ?? `https://cdn.jsdelivr.net/gh/${repository}@${ref}`;

  return {
    root,
    kit(kitId) {
      return cdnUrlForKit(kitId, { catalog, repository, ref });
    },
    domain(domainId) {
      getDomainKitIds(domainId, catalog);
      return `${root}/domains/${domainId}/index.js`;
    },
    bundle(bundleId) {
      getBundleDomainIds(bundleId, catalog);
      return `${root}/bundles/${bundleId}.js`;
    },
    installer() {
      return `${root}/installer/index.js`;
    },
    catalog() {
      return `${root}/kit-catalog.json`;
    }
  };
}
