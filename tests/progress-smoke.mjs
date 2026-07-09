import assert from "node:assert/strict";
import { getKitProgress, listKitIds } from "../installer/index.js";

const progress = getKitProgress();
assert.equal(listKitIds().length, 120);
assert.equal(progress.baselineTotal, 120);
assert.equal(progress.baselineResolved, 1);
assert.equal(progress.baselineRemaining, 119);
assert.equal(progress.official, 1);
assert.equal(progress.candidate, 1);
assert.equal(progress.scaffolded, 9);
assert.equal(progress.placeholder, 109);
assert.equal(progress.approvedAdditionsResolved, 0);
assert.equal(progress.approvedAdditionsTotal, 3);
assert.equal(progress.activeCapability, "kit-registry-domain-kit");

console.log("kit progress smoke ok", progress);
