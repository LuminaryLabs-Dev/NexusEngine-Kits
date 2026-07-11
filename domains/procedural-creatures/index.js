import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "procedural-creatures";

export function createProceduralCreaturesDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, {
    allowStatuses: options.allowStatuses ?? ["official", "candidate"],
    ...options
  });
}
