import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "generic-defense";
export function createGenericDefenseDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
