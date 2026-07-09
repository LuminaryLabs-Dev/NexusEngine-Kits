import { createBundleKits } from "../installer/domain-installer.js";

export function createDefenseGameStackKits(config = {}, options = {}) {
  return createBundleKits("defense-game-stack", config, options);
}
