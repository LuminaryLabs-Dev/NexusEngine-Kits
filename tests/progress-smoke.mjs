import assert from "node:assert/strict";
import { getKitProgress, listKitIds } from "../installer/index.js";

const progress = getKitProgress();
assert.equal(listKitIds().length, 149);
assert.equal(progress.baselineTotal, 120);
assert.equal(progress.baselineResolved, 7);
assert.equal(progress.baselineRemaining, 113);
assert.equal(progress.official, 26);
assert.equal(progress.candidate, 9);
assert.equal(progress.scaffolded, 9);
assert.equal(progress.placeholder, 103);
assert.equal(progress.deprecated, 2);
assert.equal(progress.approvedAdditionsResolved, 21);
assert.equal(progress.approvedAdditionsTotal, 29);
assert.equal(progress.activeCapability, "clock-kit");
assert.equal(progress.stages.inventoried, 149);
assert.equal(progress.stages.protoValidated, 16);

console.log("kit progress smoke ok", progress);
