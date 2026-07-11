import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createInstancedRenderBatchKit } from "./index.js";

const instance = (id, x) => ({
  id,
  position: [x, 1, 0],
  scale: [2, 2, 2],
  bounds: { min: [x - 1, 0, -1], max: [x + 1, 2, 1] }
});

const engine = createRealtimeGame({ kits: [createInstancedRenderBatchKit()] });
const service = engine.n.instancedRenderBatch;
const batch = service.create({ id: "trees", capacity: 3, boundsMode: "recompute-on-change" });

batch.replaceCell("0:0", [instance("a", 0), instance("b", 3), instance("c", 6)]);
let update = batch.flush();
assert.equal(update.capacity, 3);
assert.equal(update.activeCount, 3);
assert.equal(update.overflow.count, 0);
assert.equal(update.boundsDirty, true);
assert.deepEqual(update.bounds.min, [-1, 0, -1]);
assert.deepEqual(update.bounds.max, [7, 2, 1]);

update = batch.flush();
assert.equal(update.boundsDirty, false);
assert.deepEqual(update.changedRanges, []);

batch.replaceCell("0:0", [instance("a", 0)]);
update = batch.flush();
assert.equal(update.activeCount, 1);
assert.equal(update.capacity, 3);

batch.replaceCell("0:0", [instance("a", 0), instance("b", 3), instance("c", 6)]);
update = batch.flush();
assert.equal(update.activeCount, 3, "active count must recover after a smaller population");
assert.equal(update.capacity, 3, "capacity must remain immutable");

batch.replaceCell("1:0", [instance("d", 9)]);
update = batch.flush();
assert.equal(update.requestedCount, 4);
assert.equal(update.activeCount, 3);
assert.equal(update.overflow.count, 1);
assert.deepEqual(update.overflow.instanceIds, ["d"]);

assert.equal(batch.releaseCell("0:0"), true);
update = batch.flush();
assert.equal(update.activeCount, 1);
assert.ok(update.releasedInstanceIds.includes("a"));
assert.ok(update.releasedInstanceIds.includes("b"));
assert.ok(update.releasedInstanceIds.includes("c"));

const snapshot = service.getSnapshot();
const restoredEngine = createRealtimeGame({ kits: [createInstancedRenderBatchKit()] });
restoredEngine.n.instancedRenderBatch.loadSnapshot(snapshot);
const restored = restoredEngine.n.instancedRenderBatch.get("trees");
assert.equal(restored.capacity, 3);
assert.equal(restored.flush().activeCount, 1);

console.log("instanced render batch smoke passed", restored.getStats());
