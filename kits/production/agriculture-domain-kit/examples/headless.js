import * as NexusEngine from "nexusengine";
import { createAgricultureDomainKit } from "../index.js";

const engine = NexusEngine.createEngine({
  kits: [
    NexusEngine.createCoreTransactionLedgerKit(),
    createAgricultureDomainKit(NexusEngine, {
      plots: [{ id: "field-1", soilType: "loam" }],
      cropDefinitions: {
        bean: {
          id: "bean",
          seedItemId: "bean-seed",
          harvestItemId: "bean",
          growthSeconds: 10,
          yieldMin: 2,
          yieldMax: 4
        }
      }
    })
  ]
});

engine.n.agriculture.land.prepare("field-1", "prepare-1", "farmer");
const plan = engine.n.agriculture.cultivation.plan("field-1", {
  operationId: "plant-1",
  actorId: "farmer",
  cropId: "bean"
});
console.log(plan.resourceChanges);
engine.n.agriculture.cultivation.commit(plan, "plant-1");
