import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "foundation";
export function createFoundationDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
