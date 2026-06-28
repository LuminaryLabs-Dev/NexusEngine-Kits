import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "damage-health-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createDamageHealthKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createDamageHealthKit;
