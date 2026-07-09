import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "structure-runtime-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createStructureRuntimeKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createStructureRuntimeKit;
