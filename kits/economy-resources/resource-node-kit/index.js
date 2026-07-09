import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "resource-node-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createResourceNodeKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createResourceNodeKit;
