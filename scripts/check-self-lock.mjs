import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createInstallPlanFromLockfile,
  pullRegistry,
  validateNexusEngineKitsLockfile
} from "../registry/index.js";

const template = JSON.parse(fs.readFileSync(new URL("../nexusengine.registry.json", import.meta.url), "utf8"));
const lockfile = JSON.parse(fs.readFileSync(new URL("../nexusengine-kits.lock.json", import.meta.url), "utf8"));
const validation = validateNexusEngineKitsLockfile(lockfile);
assert.equal(validation.ok, true, validation.errors.join("; "));
assert.equal(lockfile.registries.length, 1);
const registry = await pullRegistry({ registry: template, resolvedCommit: lockfile.registries[0].resolvedCommit });
const plan = createInstallPlanFromLockfile(lockfile, registry);
assert.equal(plan.ok, true);
assert.deepEqual(plan.installOrder, lockfile.resolution.installOrder);
console.log("self lockfile matches registry manifests", { commit: registry.resolvedCommit, kits: plan.installOrder.length });
