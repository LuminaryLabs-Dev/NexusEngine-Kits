import assert from "node:assert/strict";
import {
  mergeRegistries,
  pullRegistry
} from "../../registry/index.js";
import { createCdnResolver } from "../../installer/cdn-resolver.js";
import { createNexusEngineKitInstaller } from "../../installer/index.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const template = {
  schemaVersion: "nexusengine.repository-registry.v1",
  id: "LuminaryLabs-Dev/example-kits",
  owner: "LuminaryLabs-Dev",
  repository: "example-kits",
  requestedRef: "main",
  resolvedCommit: null,
  kits: [{
    id: "example-kit",
    status: "official",
    kind: "domain-service-kit",
    domain: "example",
    domainPath: "n:example:kit",
    apiName: "exampleKit",
    factory: "createExampleKit",
    entry: "./kits/example/example-kit/index.js",
    module: {
      node: "./kits/example/example-kit/index.js",
      browser: "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/example-kits@{resolvedCommit}/kits/example/example-kit/index.js"
    },
    integrity: "sha256-example",
    realBehavior: true,
    provides: ["example:kit"]
  }]
};

let metadataCalls = 0;
const trusted = await pullRegistry({ owner: "LuminaryLabs-Dev", repository: "example-kits" }, {
  metadataResolver: async () => {
    metadataCalls += 1;
    return { registry: template, resolvedCommit: commit, metadataUrl: "memory://registry" };
  }
});
assert.equal(metadataCalls, 1);
assert.equal(trusted.trusted, true);
assert.equal(trusted.resolvedCommit, commit);
assert.ok(trusted.kits[0].module.browser.includes(commit));
assert.equal(trusted.kits[0].module.browser.includes("main"), false);
assert.throws(() => createCdnResolver(), /full immutable commit SHA/);
assert.ok(createCdnResolver({ resolvedCommit: commit }).kit("generic-resource-loop-kit").includes(commit));

await assert.rejects(() => pullRegistry({ registry: template, resolvedCommit: null }), /full immutable commit SHA/);
assert.throws(() => createNexusEngineKitInstaller({ registry: template }), /full immutable commit SHA/);

const externalTemplate = {
  ...template,
  id: "ThirdParty/example-kits",
  owner: "ThirdParty",
  kits: [{
    ...template.kits[0],
    id: "external-example-kit",
    domainPath: "n:external:example",
    apiName: "externalExample",
    module: {
      node: "data:text/javascript,globalThis.__registryMetadataExecuted=true",
      browser: null
    }
  }]
};
delete globalThis.__registryMetadataExecuted;
await assert.rejects(() => pullRegistry({ registry: externalTemplate, resolvedCommit: commit }), /requires an explicit full-SHA pin/);
const external = await pullRegistry({ registry: externalTemplate, resolvedCommit: commit }, {
  externalRegistries: { "ThirdParty/example-kits": commit }
});
assert.equal(external.trusted, false);
assert.equal(globalThis.__registryMetadataExecuted, undefined, "pulling metadata must not execute module fields");

assert.throws(() => mergeRegistries([trusted, {
  ...external,
  id: "ThirdParty/conflict",
  repository: "conflict",
  kits: [{ ...external.kits[0], id: "example-kit", domainPath: "n:external:collision", apiName: "externalCollision" }]
}], { requirePinned: true }), /kit id collision/);

assert.throws(() => mergeRegistries([trusted, {
  ...external,
  id: "ThirdParty/path-conflict",
  repository: "path-conflict",
  kits: [{ ...external.kits[0], id: "different-kit", domainPath: "n:example:kit", apiName: "differentKit" }]
}], { requirePinned: true }), /domain path collision/);

console.log("repository registry trust smoke ok");
