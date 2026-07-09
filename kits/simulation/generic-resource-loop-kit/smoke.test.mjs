import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit, createResourceMeter } from "nexusengine/core-kits";
import {
  createGenericResourceLoopKit,
  GENERIC_RESOURCE_LOOP_KIT_VERSION
} from "./index.js";

function createEngine() {
  return createRealtimeGame({
    kits: [
      createCoreSimulationKit(),
      createGenericResourceLoopKit({
        recentChangeLimit: 8,
        resources: [
          {
            id: "gold",
            max: 120,
            initial: 0,
            thresholds: [
              { id: "empty", value: 0, direction: "below", repeatable: true },
              { id: "loaded", value: 15, direction: "above", once: true }
            ]
          },
          { id: "heat", max: 100, start: 50, drainPerSecond: 2 }
        ]
      })
    ]
  });
}

const engine = createEngine();
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
assert.equal(typeof engine.n.resourceMeter.spend, "function");
assert.equal(engine.n.resourceMeter, engine.n.genericResourceLoop);
assert.equal(engine.n.resourceMeter, engine.resourceMeter);
assert.equal(engine.n.resourceMeter, engine.genericResourceLoop);

engine.n.resourceMeter.restore("gold", 24, "pickup");
engine.n.resourceMeter.spend("gold", 9, "delivery");
assert.equal(engine.n.resourceMeter.get("gold").value, 15);

engine.tick(1);
assert.equal(engine.n.resourceMeter.get("heat").value, 48);
engine.n.resourceMeter.adjust("heat", 25, { reason: "engine-shaped-adjust" });
assert.equal(engine.n.resourceMeter.get("heat").value, 73);

engine.n.resourceMeter.setLocked("heat", true);
engine.n.resourceMeter.spend("heat", 10);
assert.equal(engine.n.resourceMeter.get("heat").value, 73);
engine.n.resourceMeter.setLocked("heat", false);

const snapshot = engine.n.resourceMeter.getSnapshot();
assert.equal(snapshot.version, GENERIC_RESOURCE_LOOP_KIT_VERSION);
engine.n.resourceMeter.reset();
assert.equal(engine.n.resourceMeter.get("gold").value, 0);
engine.n.resourceMeter.loadSnapshot(snapshot);
assert.equal(engine.n.resourceMeter.get("heat").value, 73);
assert.deepEqual(createEngine().n.resourceMeter.getSnapshot().resources.map(({ id, value }) => ({ id, value })), [
  { id: "gold", value: 0 },
  { id: "heat", value: 50 }
]);

const primitive = createResourceMeter({ id: "core", max: 10, initial: 5 });
primitive.restore(3);
assert.equal(primitive.snapshot().value, 8);

const scaleEngine = createRealtimeGame({
  kits: [createGenericResourceLoopKit({
    recentChangeLimit: 16,
    resources: Array.from({ length: 1000 }, (_, index) => ({ id: `meter-${index}`, max: 100, initial: 50, rate: index % 2 ? -1 : 1 }))
  })]
});
scaleEngine.tick(1);
assert.equal(scaleEngine.n.resourceMeter.getSnapshot().resources.length, 1000);
assert.ok(scaleEngine.n.resourceMeter.getSnapshot().recentChanges.length <= 16);

console.log("generic-resource-loop-kit official smoke ok");
