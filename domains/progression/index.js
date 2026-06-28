import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "progression";
export function createProgressionDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
