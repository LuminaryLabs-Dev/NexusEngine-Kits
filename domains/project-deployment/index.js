import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "project-deployment";
export function createProjectDeploymentDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
