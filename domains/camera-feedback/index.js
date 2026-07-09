import { createDomainKits } from "../../installer/domain-installer.js";

export const domainId = "camera-feedback";
export function createCameraFeedbackDomainKits(config = {}, options = {}) {
  return createDomainKits(domainId, config, options);
}
