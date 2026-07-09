import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "rpg-social";
export function createRpgSocialDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
