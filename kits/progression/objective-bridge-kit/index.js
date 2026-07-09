import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "objective-bridge-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createObjectiveBridgeKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createObjectiveBridgeKit;
