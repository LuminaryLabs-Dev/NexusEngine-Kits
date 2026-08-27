import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPOSITION_REGISTRY_SCHEMA,
  createEngineRegistrySnapshot,
  mergeRegistrySnapshots,
  normalizeRegistrySnapshot
} from "nexusengine/domains/composition/registry";
import {
  hydrateCompositionRegistry,
  pullRegistry
} from "../../registry/index.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const template = JSON.parse(fs.readFileSync(new URL("../../nexusengine.registry.json", import.meta.url), "utf8"));

assert.equal(template.schema, COMPOSITION_REGISTRY_SCHEMA);
assert.equal(template.sources[0].status, "metadata-only");
assert.equal(template.kits.every((kit) => kit.source.installable === false), true);
assert.match(template.sources[0].integrity, /^sha256:[a-f0-9]{64}$/);

const metadataOnly = normalizeRegistrySnapshot(template, {
  allowExternalParents: true,
  allowExternalReferences: true
});
assert.equal(metadataOnly.kits.length, 136);

let metadataCalls = 0;
const hydrated = await pullRegistry({ owner: "LuminaryLabs-Dev", repository: "NexusEngine-Kits" }, {
  metadataResolver: async () => {
    metadataCalls += 1;
    return { registry: template, resolvedCommit: commit, metadataUrl: "memory://registry" };
  }
});
assert.equal(metadataCalls, 1);
assert.equal(hydrated.sources[0].sourceCommit, commit);
assert.equal(hydrated.sources[0].status, "available");
assert.equal(hydrated.kits.find((kit) => kit.id === "fishing-kit").source.installable, true);
assert.equal(hydrated.kits.find((kit) => kit.status === "migration-placeholder").source.installable, false);
assert.equal(hydrated.kits.filter((kit) => kit.source.installable).length, 23);

const repeated = hydrateCompositionRegistry(template, commit);
assert.equal(repeated.contentHash, hydrated.contentHash, "same immutable source must hydrate identically");

const merged = mergeRegistrySnapshots(createEngineRegistrySnapshot(), [hydrated]);
assert.equal(merged.kits.length, createEngineRegistrySnapshot().kits.length + hydrated.kits.length);
assert.equal(
  merged.recipes.length,
  createEngineRegistrySnapshot().recipes.length + hydrated.recipes.length
);

await assert.rejects(() => pullRegistry({ registry: template }), /full immutable commit SHA/);
const invalid = structuredClone(template);
invalid.kits.find((kit) => kit.status === "official").source.installable = true;
assert.throws(() => normalizeRegistrySnapshot(invalid, {
  allowExternalParents: true,
  allowExternalReferences: true
}), /cannot be installable from metadata-only source/);

const external = structuredClone(template);
external.registryId = "third-party-kits";
external.sources[0].registryId = external.registryId;
external.sources[0].metadata.owner = "ThirdParty";
external.sources[0].metadata.repository = "example-kits";
for (const domain of external.domains) domain.sourceRegistryId = external.registryId;
for (const kit of external.kits) kit.source.registryId = external.registryId;
for (const recipe of external.recipes) recipe.sourceRegistryId = external.registryId;
assert.throws(() => hydrateCompositionRegistry(external, commit), /explicit full-SHA pin/);
assert.doesNotThrow(() => hydrateCompositionRegistry(external, commit, {
  externalRegistries: { "third-party-kits": commit }
}));
assert.throws(() => hydrateCompositionRegistry(external, commit, {
  externalRegistries: { "third-party-kits": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }
}), /not approved pin/);

delete globalThis.__registryMetadataExecuted;
assert.equal(globalThis.__registryMetadataExecuted, undefined, "registry metadata must remain non-executable");

console.log("composition registry v3 trust smoke ok");
