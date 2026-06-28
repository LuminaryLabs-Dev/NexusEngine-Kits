import { createBundleKits } from "../installer/domain-installer.js";

export function createDefaultGameStackKits(config = {}, options = {}) {
  return createBundleKits("default-game-stack", config, options);
}
