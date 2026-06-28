import { createBundleKits } from "../installer/domain-installer.js";

export function createRpgGameStackKits(config = {}, options = {}) {
  return createBundleKits("rpg-game-stack", config, options);
}
