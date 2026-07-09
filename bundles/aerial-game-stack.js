import { createBundleKits } from "../installer/domain-installer.js";

export function createAerialGameStackKits(config = {}, options = {}) {
  return createBundleKits("aerial-game-stack", config, options);
}
