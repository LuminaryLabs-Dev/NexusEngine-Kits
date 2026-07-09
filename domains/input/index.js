import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "input";
export function createInputDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
