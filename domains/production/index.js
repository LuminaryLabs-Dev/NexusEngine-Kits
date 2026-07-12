import { createAgricultureDomainKit } from "../../kits/production/agriculture-domain-kit/index.js";

export const domainId = "production";
export { createAgricultureDomainKit };

export function createProductionDomainKits(NexusEngine, config = {}) {
  return [createAgricultureDomainKit(NexusEngine, config.agriculture ?? config)];
}
