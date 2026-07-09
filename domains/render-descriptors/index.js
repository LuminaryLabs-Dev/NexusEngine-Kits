import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "render-descriptors";
export function createRenderDescriptorsDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
