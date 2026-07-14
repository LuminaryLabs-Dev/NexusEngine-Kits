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

const incremental = service.create({
  id: "patch-owned-grass",
  capacity: 8,
  cellCapacity: 2,
  updateMode: "incremental",
  boundsMode: "recompute-on-change"
});

let cell = incremental.replaceCell("0:0", [instance("g0", 0), instance("g1", 2)]);
assert.deepEqual(cell.range, { start: 0, count: 2 });
update = incremental.flush();
assert.deepEqual(update.changedRanges, [{ start: 0, count: 2 }]);
assert.equal(update.instanceWrites.length, 1);
assert.equal(update.instanceWrites[0].instances[0].id, "g0");
assert.equal(update.slotCount, 2);
assert.deepEqual(update.instances, [], "incremental flushes do not clone the complete active set");

cell = incremental.replaceCell("1:0", [instance("g2", 4)]);
assert.deepEqual(cell.range, { start: 2, count: 2 });
update = incremental.flush();
assert.deepEqual(update.changedRanges, [{ start: 2, count: 2 }]);
assert.equal(update.activeCount, 3);
assert.equal(update.slotCount, 4);

incremental.replaceCell("0:0", [instance("g0", 1)]);
update = incremental.flush();
assert.deepEqual(update.changedRanges, [{ start: 0, count: 2 }]);
assert.deepEqual(update.cellRanges.find((entry) => entry.cellId === "1:0"), {
  cellId: "1:0",
  start: 2,
  count: 2,
  activeCount: 1,
  requestedCount: 1,
  overflowCount: 0
});

assert.equal(incremental.releaseCell("0:0"), true);
update = incremental.flush();
assert.deepEqual(update.changedRanges, [{ start: 0, count: 2 }]);
assert.equal(update.instanceWrites[0].instances.every((entry) => entry === null), true);
assert.equal(update.activeCount, 1);
assert.equal(update.slotCount, 4, "unchanged cells retain stable ranges");

cell = incremental.replaceCell("2:0", [instance("g3", 6), instance("g4", 8), instance("g5", 10)]);
assert.deepEqual(cell.range, { start: 0, count: 2 }, "released ranges are reused without moving live cells");
assert.equal(cell.overflowCount, 1);
update = incremental.flush();
assert.deepEqual(update.changedRanges, [{ start: 0, count: 2 }]);
assert.deepEqual(update.overflow.instanceIds, ["g5"]);

const snapshot = service.getSnapshot();
const restoredEngine = createRealtimeGame({ kits: [createInstancedRenderBatchKit()] });
restoredEngine.n.instancedRenderBatch.loadSnapshot(snapshot);
const restored = restoredEngine.n.instancedRenderBatch.get("trees");
assert.equal(restored.capacity, 3);
assert.equal(restored.flush().activeCount, 1);
const restoredIncremental = restoredEngine.n.instancedRenderBatch.get("patch-owned-grass");
assert.equal(restoredIncremental.updateMode, "incremental");
assert.equal(restoredIncremental.flush().activeCount, 3);

console.log("instanced render batch smoke passed", restoredIncremental.getStats());
