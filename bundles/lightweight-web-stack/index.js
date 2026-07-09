import { createBundleKits } from "../../installer/domain-installer.js";

export function createLightweightWebStackKits(config = {}, options = {}) {
  return createBundleKits("lightweight-web-stack", config, options);
}
