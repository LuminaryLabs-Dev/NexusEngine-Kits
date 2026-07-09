import assert from "node:assert/strict";
import { NEXUSENGINE_REPOSITORY_REGISTRY } from "../../installer/kit-catalog.js";
import {
  createInstallPlan,
  createInstallPlanFromLockfile,
  createNexusEngineKitsLockfile,
  pullRegistry,
  validateNexusEngineKitsLockfile
} from "../../registry/index.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const registry = await pullRegistry({ registry: NEXUSENGINE_REPOSITORY_REGISTRY, resolvedCommit: commit });
const selection = { bundles: ["registry-control-plane"] };
const plan = createInstallPlan(selection, { registry });
assert.equal(plan.ok, true);
assert.deepEqual(plan.installOrder, [
  "kit-registry-domain-kit",
  "capability-graph-domain-kit",
  "composition-planning-domain-kit"
]);

const lockfile = createNexusEngineKitsLockfile({ registries: [registry], selection, plan });
assert.equal(validateNexusEngineKitsLockfile(lockfile).ok, true);
assert.equal(lockfile.registries[0].resolvedCommit, commit);
assert.ok(lockfile.resolution.kits.every((kit) => kit.integrity?.startsWith("sha256-")));

const offlinePlan = createInstallPlanFromLockfile(lockfile, registry);
assert.equal(offlinePlan.ok, true);
assert.equal(offlinePlan.fromLockfile, true);

const tampered = structuredClone(lockfile);
tampered.resolution.kits[0].integrity = "sha256-tampered";
assert.throws(() => createInstallPlanFromLockfile(tampered, registry), /integrity mismatch/i);
assert.throws(() => createNexusEngineKitsLockfile({ registries: [{ ...registry, resolvedCommit: null }], selection, plan }), /full commit SHA/);

console.log("registry lockfile smoke ok");
