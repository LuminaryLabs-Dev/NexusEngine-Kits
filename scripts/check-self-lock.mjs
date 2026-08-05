import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createInstallPlan,
  createInstallPlanFromLockfile,
  validateNexusEngineKitsLockfile
} from "../registry/index.js";
import { NEXUSENGINE_REPOSITORY_REGISTRY } from "../installer/kit-catalog.js";
import { hydrateInternalRepositoryRegistry } from "../installer/internal-repository-registry.js";

const packageManifest = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const npmLockfile = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const engineCommit = packageManifest.nexusIntegrationArtifacts.engine.commit;
const engineSource = `git+https://github.com/LuminaryLabs-Dev/NexusEngine.git#${engineCommit}`;
assert.equal(packageManifest.devDependencies.nexusengine, engineSource, "Engine development dependency must use exact-commit HTTPS");
assert.equal(npmLockfile.packages["node_modules/nexusengine"].resolved, engineSource, "Engine lock must use exact-commit HTTPS");

const lockfile = JSON.parse(fs.readFileSync(new URL("../nexusengine-kits.lock.json", import.meta.url), "utf8"));
const validation = validateNexusEngineKitsLockfile(lockfile);
assert.equal(validation.ok, true, validation.errors.join("; "));
assert.equal(lockfile.registries.length, 1);
const registry = hydrateInternalRepositoryRegistry(
  NEXUSENGINE_REPOSITORY_REGISTRY,
  lockfile.registries[0].resolvedCommit
);
const currentPlan = createInstallPlan(lockfile.selection, { registry });
assert.equal(currentPlan.ok, true);
assert.deepEqual(currentPlan.installOrder, lockfile.resolution.installOrder, "self lockfile must resolve every currently selected official kit");
const plan = createInstallPlanFromLockfile(lockfile, registry);
assert.equal(plan.ok, true);
assert.deepEqual(plan.installOrder, lockfile.resolution.installOrder);
console.log("self lockfile matches internal installer manifests", { commit: registry.resolvedCommit, kits: plan.installOrder.length });
