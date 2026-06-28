import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "build-placement-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createBuildPlacementKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createBuildPlacementKit;
