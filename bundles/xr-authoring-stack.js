import { createBundleKits } from "../installer/domain-installer.js";

export function createXrAuthoringStackKits(config = {}, options = {}) {
  return createBundleKits("xr-authoring-stack", config, options);
}
