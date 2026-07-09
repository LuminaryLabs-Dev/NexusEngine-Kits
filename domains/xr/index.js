import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "xr";
export function createXrDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
