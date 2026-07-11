import { createCapabilityGraphDomainKit as factory0 } from "../kits/registry/capability-graph-domain-kit/index.js";
import { createCompletionLedgerKit as factory1 } from "../kits/spatial/completion-ledger-kit/index.js";
import { createCompositionPlanningDomainKit as factory2 } from "../kits/registry/composition-planning-domain-kit/index.js";
import { createGenericResourceLoopKit as factory3 } from "../kits/simulation/generic-resource-loop-kit/index.js";
import { createInstancedRenderBatchKit as factory4 } from "../kits/render-descriptors/instanced-render-batch-kit/index.js";
import { createKitRegistryDomainKit as factory5 } from "../kits/registry/kit-registry-domain-kit/index.js";
import { createProceduralCreatureBodyKit as factory6 } from "../kits/procedural-creatures/procedural-creature-body-kit/index.js";
import { createProtokitCore as factory7 } from "../kits/foundation/protokit-core/index.js";
import { createSeedKit as factory8 } from "../kits/foundation/seed-kit/index.js";
import { createSeededWorldPatchControllerKit as factory9 } from "../kits/simulation/seeded-world-patch-controller-kit/index.js";

export const GENERATED_KIT_FACTORIES = Object.freeze({
  "capability-graph-domain-kit": factory0,
  "completion-ledger-kit": factory1,
  "composition-planning-domain-kit": factory2,
  "generic-resource-loop-kit": factory3,
  "instanced-render-batch-kit": factory4,
  "kit-registry-domain-kit": factory5,
  "procedural-creature-body-kit": factory6,
  "protokit-core": factory7,
  "seed-kit": factory8,
  "seeded-world-patch-controller-kit": factory9
});
