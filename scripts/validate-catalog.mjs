import assert from "node:assert/strict";
import { KIT_CATALOG, listKitIds, listDomainIds } from "../installer/kit-catalog.js";

assert.ok(KIT_CATALOG.name, "catalog must have a name");
assert.ok(listDomainIds().length > 0, "catalog must have domains");
assert.ok(listKitIds().length > 0, "catalog must have kits");

for (const [domainId, kitIds] of Object.entries(KIT_CATALOG.domains)) {
  assert.ok(Array.isArray(kitIds), `domain ${domainId} must list kits`);
}

console.log("catalog ok", { domains: listDomainIds().length, kits: listKitIds().length });
