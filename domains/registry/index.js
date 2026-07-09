import { createKitRegistryDomainKit } from "../../kits/registry/kit-registry-domain-kit/index.js";
import { createCapabilityGraphDomainKit } from "../../kits/registry/capability-graph-domain-kit/index.js";
import { createCompositionPlanningDomainKit } from "../../kits/registry/composition-planning-domain-kit/index.js";

export function createRegistryDomainKits(config = {}) {
  return [
    createKitRegistryDomainKit(config.kitRegistry ?? {}),
    createCapabilityGraphDomainKit(config.capabilityGraph ?? {}),
    createCompositionPlanningDomainKit(config.compositionPlanning ?? {})
  ];
}

export default createRegistryDomainKits;
