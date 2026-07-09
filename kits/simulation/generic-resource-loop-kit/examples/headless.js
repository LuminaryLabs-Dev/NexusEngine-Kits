import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createGenericResourceLoopKit } from "../index.js";

const engine = createRealtimeGame({
  kits: [
    createCoreSimulationKit(),
    createGenericResourceLoopKit({
      resources: [{ id: "energy", max: 100, initial: 80, ratePerSecond: -2 }]
    })
  ]
});

engine.tick(1);
console.log(engine.n.resourceMeter.get("energy"));
