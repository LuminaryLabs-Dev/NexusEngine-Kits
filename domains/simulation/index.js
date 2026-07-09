import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "simulation";
export function createSimulationDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
