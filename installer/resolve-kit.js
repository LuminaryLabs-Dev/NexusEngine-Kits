import { KIT_CATALOG, resolveKitManifest } from "./kit-catalog.js";
import { assertValidKitManifest } from "./validate-kit-manifest.js";

export function resolveKit(kitId, options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  return assertValidKitManifest(resolveKitManifest(kitId, catalog));
}
