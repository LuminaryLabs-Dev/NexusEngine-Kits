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
console.log("seeded world patch controller smoke passed", controller.getStats());
