import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "hazard-combat";
export function createHazardCombatDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
