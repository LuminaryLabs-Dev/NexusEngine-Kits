import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createSeedKit } from "../../foundation/seed-kit/index.js";
import {
  createMessageWorkerExecutor,
  createSeededWorldPatchControllerKit
} from "./index.js";

const engine = createRealtimeGame({
  kits: [
    createSeedKit({ seed: "patch-world" }),
    createSeededWorldPatchControllerKit()
  ]
});

const service = engine.n.seededWorldPatchController;
let generated = 0;
const controller = service.create({
  id: "world",
  patchSize: 8,
  activeRadius: 0,
  retainRadius: 1,
  prefetchDistance: 1,
  cacheLimit: 8,
  activationBudget: 1,
  generationBudget: 1,
  generatorVersion: "test-v1",
  terrainSettingsHash: "terrain-test",
  vegetationSettingsHash: "vegetation-test",
  generator(request) {
    generated += 1;
    return { id: request.patchId, key: request.cacheKey, value: `${request.x},${request.z}` };
  }
});

controller.setFocus({ position: { x: 0, z: 0 }, forward: { x: 1, z: 0 } });
let stats = controller.update();
assert.equal(stats.desiredActive, 1);
assert.ok(stats.desiredPrefetch > stats.desiredActive);

controller.generateSync(0, 0);
let ready = controller.takeReadyPatches({ maximum: 1 });
assert.equal(ready.length, 1);
assert.equal(ready[0].id, "0:0");
assert.equal(controller.getStats().active, 1);

controller.setFocus({ position: { x: 9, z: 0 }, forward: { x: 1, z: 0 } });
controller.update();
assert.deepEqual(controller.takeReleasedPatchIds(), ["0:0"]);
controller.pump({ maximum: 1 });
await new Promise((resolve) => setTimeout(resolve, 15));
ready = controller.takeReadyPatches({ maximum: 1 });
assert.equal(ready.length, 1);
assert.equal(ready[0].id, "1:0");

const generatedBeforeReturn = generated;
controller.setFocus({ position: { x: 0, z: 0 }, forward: { x: -1, z: 0 } });
controller.update();
ready = controller.takeReadyPatches({ maximum: 1 });
assert.equal(ready[0].id, "0:0", "cached patch should reactivate without regeneration");
assert.equal(generated, generatedBeforeReturn);

const requestCounts = new Map();
const prioritySamples = [];
const twoTierController = service.create({
  id: "two-tier-world",
  patchSize: 8,
  activeRadius: 1,
  retainRadius: 3,
  prefetchDistance: 3,
  cacheLimit: 64,
  activationBudget: 9,
  generationBudget: 64,
  generatorVersion: "two-tier-v1",
  priorityPolicyId: "runner-forward-v1",
  priorityPolicy(context) {
    prioritySamples.push({
      patchId: context.patchId,
      reason: context.reason,
      forwardDot: context.forwardDot,
      lateralDistance: context.lateralDistance
    });
    if (context.reason === "active" && context.distance <= 1) return context.distance;
    if (context.reason === "prefetch") return 3 + context.step + context.lateralDistance;
    return 10 + context.distance - context.forwardDot;
  },
  generator(request) {
    requestCounts.set(request.patchId, (requestCounts.get(request.patchId) ?? 0) + 1);
    return { id: request.patchId, key: request.cacheKey, x: request.x, z: request.z };
  }
});

twoTierController.setFocus({ position: { x: 0, z: 0 }, forward: { x: 0, z: 1 } });
stats = twoTierController.update();
assert.equal(stats.desiredActive, 9);
assert.ok(stats.desiredPrefetch > stats.desiredActive);
assert.equal(stats.priorityPolicyId, "runner-forward-v1");
assert.ok(prioritySamples.some((entry) => entry.reason === "prefetch" && entry.forwardDot > 0));

twoTierController.pump({ maximum: 64 });
await new Promise((resolve) => setTimeout(resolve, 20));
const activeEntries = twoTierController.takeReadyPatches({ maximum: 9 });
assert.equal(activeEntries.length, 9, "the 3x3 simulation core becomes active");

const prefetchedEntries = [];
for (;;) {
  const batch = twoTierController.takeReadyPrefetchPatches({ maximum: 16 });
  if (!batch.length) break;
  prefetchedEntries.push(...batch);
}
assert.ok(prefetchedEntries.length >= 12, "the controller exposes presentation-only forward patches");
assert.equal(
  twoTierController.getPresentationPrefetchedPatchIds().length,
  prefetchedEntries.length,
  "presentation-prefetched ownership is explicit"
);
const forwardReadiness = twoTierController.getForwardReadiness();
assert.ok(forwardReadiness.ready >= 12);
assert.ok(forwardReadiness.forwardBufferedMeters >= 8);

const promotionId = prefetchedEntries.find((entry) => entry.id === "0:2")?.id ?? prefetchedEntries[0].id;
const [promotionX, promotionZ] = promotionId.split(":").map(Number);
twoTierController.setFocus({
  position: { x: promotionX * 8, z: promotionZ * 8 },
  forward: { x: 0, z: 1 }
});
twoTierController.update();
const promoted = twoTierController.promotePrefetchPatch(promotionId);
assert.equal(promoted?.promoted, true);
assert.ok(twoTierController.getActivePatchIds().includes(promotionId));
assert.equal(requestCounts.get(promotionId), 1, "promotion reuses the generated patch without regeneration");

const fakeWorker = new EventTarget();
fakeWorker.postMessage = (message) => {
  queueMicrotask(() => fakeWorker.dispatchEvent(new MessageEvent("message", {
    data: { type: "patch-generated", requestId: message.requestId, patch: { id: message.request.patchId } }
  })));
};
const executor = createMessageWorkerExecutor(fakeWorker);
assert.deepEqual(await executor.run({ requestId: "request-1", patchId: "2:0" }), { id: "2:0" });
executor.dispose();

const snapshot = controller.getSnapshot();
assert.equal(snapshot.config.worldSeed, "patch-world");
assert.ok(snapshot.cacheDigest);
console.log("seeded world patch controller smoke passed", {
  base: controller.getStats(),
  twoTier: twoTierController.getStats()
});
