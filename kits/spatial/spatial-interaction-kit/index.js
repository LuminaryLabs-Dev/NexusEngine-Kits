import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "spatial-interaction-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createSpatialInteractionKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createSpatialInteractionKit;
