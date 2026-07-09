import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "aerial";
export function createAerialDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
