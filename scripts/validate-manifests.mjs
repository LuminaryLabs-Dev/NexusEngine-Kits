import assert from "node:assert/strict";
import {
  NEXUSENGINE_REPOSITORY_REGISTRY,
  getKitProgress,
  listKitManifests
} from "../installer/kit-catalog.js";
import { validateKitManifest } from "../installer/validate-kit-manifest.js";

const manifests = listKitManifests();
const ids = new Set();
const paths = new Set();
const apis = new Set();
for (const manifest of manifests) {
  const result = validateKitManifest(manifest);
  assert.equal(result.ok, true, `${manifest.id}: ${result.errors.join("; ")}`);
  assert.equal(ids.has(manifest.id), false, `duplicate kit id ${manifest.id}`);
  assert.equal(paths.has(manifest.domainPath), false, `duplicate domain path ${manifest.domainPath}`);
  assert.equal(apis.has(manifest.apiName), false, `duplicate API name ${manifest.apiName}`);
  ids.add(manifest.id);
  paths.add(manifest.domainPath);
  apis.add(manifest.apiName);
}

const progress = getKitProgress();
assert.equal(manifests.length, progress.baselineTotal + progress.approvedAdditionsTotal);
assert.equal(NEXUSENGINE_REPOSITORY_REGISTRY.kits.length, manifests.length);
assert.equal(progress.baselineResolved + progress.baselineRemaining, progress.baselineTotal);

console.log("manifests ok", { kits: manifests.length, progress });
