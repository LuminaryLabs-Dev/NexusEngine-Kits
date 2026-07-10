import assert from "node:assert/strict";
import { getKitProgress, listKitIds } from "../installer/index.js";

const progress = getKitProgress();
assert.equal(listKitIds().length, 123);
assert.equal(progress.baselineTotal, 120);
assert.equal(progress.baselineResolved, 3);
assert.equal(progress.baselineRemaining, 117);
assert.equal(progress.official, 5);
assert.equal(progress.candidate, 1);
assert.equal(progress.scaffolded, 9);
assert.equal(progress.placeholder, 107);
assert.equal(progress.deprecated, 1);
assert.equal(progress.approvedAdditionsResolved, 3);
assert.equal(progress.approvedAdditionsTotal, 3);
assert.equal(progress.activeCapability, "clock-kit");
assert.equal(progress.stages.inventoried, 123);
assert.equal(progress.stages.protoValidated, 7);

console.log("kit progress smoke ok", progress);
