import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "rpg-combat";
export function createRpgCombatDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
