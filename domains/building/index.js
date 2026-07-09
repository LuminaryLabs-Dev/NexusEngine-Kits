import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "building";
export function createBuildingDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
