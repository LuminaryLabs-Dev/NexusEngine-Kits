import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "spatial";
export function createSpatialDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
