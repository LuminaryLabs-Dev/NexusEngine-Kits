import assert from "node:assert/strict";
import * as NexusEngine from "nexusengine";
import { createAgricultureDomainKit } from "./index.js";

function createEngine(config) {
  return NexusEngine.createEngine({
    kits: [
      NexusEngine.createCoreTransactionLedgerKit(),
      createAgricultureDomainKit(NexusEngine, config)
    ]
  });
}

const tropical = {
  growthMode: "continuous",
  soilDefaults: { soilType: "tropical-loam", moisture: 0.4, fertility: 0.9 },
  plots: [{ id: "plot-1" }, { id: "plot-2" }],
  cropDefinitions: {
    taro: { id: "taro", seedItemId: "taro-seed", harvestItemId: "taro-root", growthSeconds: 4, stageCount: 4, yieldMin: 2, yieldMax: 4, preferredSoils: ["tropical-loam"] },
    coconut: { id: "coconut", seedItemId: "coconut-sprout", harvestItemId: "coconut", growthSeconds: 4, regrowSeconds: 2, stageCount: 5, yieldMin: 2, yieldMax: 3, perennial: true, preferredSoils: ["tropical-loam"] }
  }
};

function runTropical() {
  const engine = createEngine(tropical);
  const agriculture = engine.n.agriculture;
  assert.ok(agriculture);
  assert.equal(engine.n.paths().some((entry) => entry.path === "n:production:agriculture"), true);
  assert.deepEqual(Object.keys(agriculture).filter((key) => ["land", "soil", "cultivation", "water", "growth", "harvest", "perennials"].includes(key)).sort(), ["cultivation", "growth", "harvest", "land", "perennials", "soil", "water"]);

  agriculture.land.prepare("plot-1", "prepare-1", "player");
  const duplicate = agriculture.land.prepare("plot-1", "prepare-1", "player");
  assert.equal(duplicate.duplicate, true);
  const plant = agriculture.cultivation.plan("plot-1", { operationId: "plant-1", actorId: "player", cropId: "taro" });
  assert.deepEqual(plant.resourceChanges, [{ itemId: "taro-seed", amount: -1, reason: "plant" }]);
  agriculture.cultivation.commit(plant, "plant-1");
  agriculture.water.apply("plot-1", "water-1", "player");
  engine.tick(4.1);
  assert.equal(agriculture.getPlot("plot-1").status, "ready");
  const harvest = agriculture.harvest.plan("plot-1", { operationId: "harvest-1", actorId: "player" });
  assert.equal(harvest.resourceChanges[0].itemId, "taro-root");
  agriculture.harvest.commit(harvest, "harvest-1");

  agriculture.land.prepare("plot-2", "prepare-2", "player");
  agriculture.cultivation.plant("plot-2", "coconut", "plant-2", "player");
  agriculture.water.apply("plot-2", "water-2", "player");
  engine.tick(4.1);
  const palmHarvest = agriculture.harvest.plan("plot-2", { operationId: "harvest-2", actorId: "player" });
  agriculture.harvest.commit(palmHarvest, "harvest-2");
  assert.equal(agriculture.getPlot("plot-2").status, "regrowing");
  engine.tick(2.1);
  assert.equal(agriculture.getPlot("plot-2").status, "ready");

  const snapshot = agriculture.getSnapshot();
  const restored = createEngine(tropical);
  restored.n.agriculture.loadSnapshot(snapshot);
  assert.deepEqual(restored.n.agriculture.getSnapshot(), snapshot);
  return { snapshot, ledger: engine.n.coreTransactionLedger.getSnapshot(), descriptors: agriculture.getDescriptors() };
}

assert.deepEqual(runTropical(), runTropical(), "tropical agriculture replay is deterministic");

const temperate = createEngine({
  growthMode: "daily",
  secondsPerResolvedDay: 60,
  soilDefaults: { soilType: "temperate-loam", moisture: 0.25, fertility: 0.75 },
  plots: [{ id: "field" }, { id: "orchard" }],
  cropDefinitions: {
    wheat: { id: "wheat", seedItemId: "wheat-seed", harvestItemId: "wheat", growthDays: 2, stageCount: 3, yieldMin: 3, yieldMax: 5, preferredSoils: ["temperate-loam"] },
    apple: { id: "apple", seedItemId: "apple-sapling", harvestItemId: "apple", growthDays: 1, regrowDays: 1, stageCount: 4, yieldMin: 2, yieldMax: 4, perennial: true, preferredSoils: ["temperate-loam"] }
  }
});

temperate.n.agriculture.land.prepare("field", "field-prepare", "farmer");
temperate.n.agriculture.cultivation.plant("field", "wheat", "wheat-plant", "farmer");
temperate.n.agriculture.water.apply("field", "wheat-water", "farmer");
temperate.n.agriculture.growth.resolveDay(1, { rainfall: 0 }, "day-1");
temperate.n.agriculture.growth.resolveDay(2, { rainfall: 0.8 }, "day-2");
assert.equal(temperate.n.agriculture.getPlot("field").status, "ready");
assert.equal(temperate.n.agriculture.growth.resolveDay(2, { rainfall: 0.8 }, "day-2").duplicate, true);

temperate.n.agriculture.land.prepare("orchard", "orchard-prepare", "farmer");
temperate.n.agriculture.cultivation.plant("orchard", "apple", "apple-plant", "farmer");
temperate.n.agriculture.growth.resolveDay(3, { rainfall: 1 }, "day-3");
const appleHarvest = temperate.n.agriculture.harvest.plan("orchard", { operationId: "apple-harvest", actorId: "farmer" });
temperate.n.agriculture.harvest.commit(appleHarvest, "apple-harvest");
assert.equal(temperate.n.agriculture.getPlot("orchard").status, "regrowing");
assert.equal(temperate.n.agriculture.perennials.list().some((crop) => crop.id === "apple"), true);

console.log("agriculture-domain-kit: official tropical, temperate, replay, snapshot, duplicate, and perennial smoke passed");
