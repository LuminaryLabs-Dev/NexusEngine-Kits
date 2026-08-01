import assert from "node:assert/strict";
import { getKitProgress, listKitIds } from "../installer/index.js";

const progress = getKitProgress();
assert.equal(listKitIds().length, 134);
assert.equal(progress.baselineTotal, 108);
assert.equal(progress.baselineResolved, 5);
assert.equal(progress.baselineRemaining, 103);
assert.equal(progress.official, 23);
assert.equal(progress.candidate, 8);
assert.equal(progress.scaffolded, 8);
assert.equal(progress.placeholder, 95);
assert.equal(progress.deprecated, 0);
assert.equal(progress.approvedAdditionsResolved, 18);
assert.equal(progress.approvedAdditionsTotal, 26);
assert.equal(progress.activeCapability, "clock-kit");
assert.equal(progress.stages.inventoried, 134);
assert.equal(progress.stages.protoValidated, 10);

console.log("kit progress smoke ok", progress);
