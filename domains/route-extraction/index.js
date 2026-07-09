import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "route-extraction";
export function createRouteExtractionDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
