import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "asset-descriptor-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createAssetDescriptorKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createAssetDescriptorKit;
