import assert from "node:assert/strict";
import { resolveKitManifest, listKitIds } from "../installer/kit-catalog.js";
import { validateKitManifest } from "../installer/validate-kit-manifest.js";

for (const kitId of listKitIds()) {
  const result = validateKitManifest(resolveKitManifest(kitId));
  assert.equal(result.ok, true, `${kitId}: ${result.errors.join("; ")}`);
}

console.log("manifests ok", { kits: listKitIds().length });
