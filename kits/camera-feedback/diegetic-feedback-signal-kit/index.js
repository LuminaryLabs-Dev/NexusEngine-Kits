import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { createManifestRuntimeKit } from "../../../installer/kit-manifest-loader.js";

export const kitId = "diegetic-feedback-signal-kit";
export const kitManifest = resolveKitManifest(kitId);

export function createDiegeticFeedbackSignalKit(config = {}) {
  return createManifestRuntimeKit(kitManifest, config);
}

export default createDiegeticFeedbackSignalKit;
