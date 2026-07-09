import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "economy-resources";
export function createEconomyResourcesDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
