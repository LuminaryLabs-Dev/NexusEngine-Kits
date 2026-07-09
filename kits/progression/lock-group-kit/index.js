import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "lock-group-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createLockGroupKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createLockGroupKit;
