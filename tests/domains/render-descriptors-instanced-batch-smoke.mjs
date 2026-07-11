import assert from "node:assert/strict";
import fs from "node:fs";
import { createRealtimeGame } from "nexusengine";
import { createInstancedRenderBatchKit } from "../../kits/render-descriptors/instanced-render-batch-kit/index.js";

const domain = JSON.parse(fs.readFileSync(new URL("../../manifests/domains/render-descriptors.json", import.meta.url), "utf8"));
assert.ok(domain.kits.includes("instanced-render-batch-kit"));

const engine = createRealtimeGame({ kits: [createInstancedRenderBatchKit()] });
const batch = engine.n.instancedRenderBatch.create({ id: "domain-proof", capacity: 2 });
batch.replaceCell("proof", [{ id: "one", position: [0, 0, 0] }]);
const update = batch.flush();
assert.equal(update.activeCount, 1);
assert.equal(update.capacity, 2);
assert.equal(update.boundsDirty, true);

console.log("render descriptors instanced batch domain smoke passed", update.id);
