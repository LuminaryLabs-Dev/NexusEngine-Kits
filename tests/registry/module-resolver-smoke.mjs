import assert from "node:assert/strict";
import crypto, { webcrypto } from "node:crypto";
import { createEngine } from "nexusengine";
import { createNexusEngineKitInstaller } from "../../installer/index.js";
import { createBrowserModuleResolver, sha256Integrity } from "../../registry/index.js";
import { createNodeModuleResolver } from "../../registry/node-module-resolver.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const sourcePath = "./kits/aquatic/fishing-kit/index.js";
const bytes = await (await import("node:fs/promises")).readFile(new URL(`../../${sourcePath.replace(/^\.\//, "")}`, import.meta.url));
const integrity = `sha256-${crypto.createHash("sha256").update(bytes).digest("base64")}`;
const externalRegistry = {
  schemaVersion: "nexusengine-kits.internal-registry/1",
  id: "ThirdParty/verified-kits",
  owner: "ThirdParty",
  repository: "verified-kits",
  requestedRef: commit,
  resolvedCommit: commit,
  kits: [{
    id: "external-fishing-kit",
    version: "1.0.0",
    status: "official",
    kind: "domain-service-kit",
    domain: "external-fishing",
    domainPath: "n:external:fishing",
    apiName: "externalFishing",
    factory: "createFishingKit",
    entry: sourcePath,
    module: { node: sourcePath, package: sourcePath, browser: null },
    integrity,
    environments: ["node"],
    requires: [],
    provides: ["external:fishing"],
    realBehavior: true
  }]
};

const engine = createEngine();
assert.throws(() => createNexusEngineKitInstaller({ registry: externalRegistry, factoryRegistry: {} }), /explicit full-SHA pin/);
const blocked = createNexusEngineKitInstaller({
  registry: externalRegistry,
  externalRegistries: { "ThirdParty/verified-kits": commit },
  factoryRegistry: {},
  moduleResolver: createNodeModuleResolver({ baseDirectory: new URL("../../", import.meta.url).pathname })
});
const blockedResult = await blocked.installKit(engine, "external-fishing-kit", { id: "external-fishing-kit" });
assert.equal(blockedResult.installed, false);
assert.match(blockedResult.report.errors[0].message, /External kit code is disabled/);

const allowed = createNexusEngineKitInstaller({
  registry: externalRegistry,
  externalRegistries: { "ThirdParty/verified-kits": commit },
  factoryRegistry: {},
  allowExternalCode: true,
  moduleResolver: createNodeModuleResolver({ baseDirectory: new URL("../../", import.meta.url).pathname })
});
const allowedResult = await allowed.installKit(engine, "external-fishing-kit", { id: "external-fishing-kit" });
assert.equal(
  allowedResult.installed,
  true,
  JSON.stringify(allowedResult.report?.errors ?? [])
);

const browserSource = "export const createExampleKit = () => ({ id: 'example-kit' });";
const browserIntegrity = await sha256Integrity(browserSource, { subtle: webcrypto.subtle });
let importCalls = 0;
const browserResolver = createBrowserModuleResolver({
  subtle: webcrypto.subtle,
  fetch: async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(browserSource).buffer }),
  importModule: async () => {
    importCalls += 1;
    return { createExampleKit: () => ({ id: "example-kit" }) };
  }
});
const browserManifest = {
  id: "example-kit",
  factory: "createExampleKit",
  integrity: browserIntegrity,
  source: { resolvedCommit: commit },
  module: { browser: `https://cdn.jsdelivr.net/gh/ThirdParty/example@${commit}/index.js` }
};
const verified = await browserResolver(browserManifest);
assert.equal(verified.verifiedIntegrity, browserIntegrity);
assert.equal(importCalls, 1);

const tamperedResolver = createBrowserModuleResolver({
  subtle: webcrypto.subtle,
  fetch: async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(`${browserSource} // tampered`).buffer }),
  importModule: async () => {
    importCalls += 1;
    return { createExampleKit: () => ({ id: "example-kit" }) };
  }
});
await assert.rejects(() => tamperedResolver(browserManifest), /Integrity mismatch/);
assert.equal(importCalls, 1, "integrity failure must happen before browser module execution");

console.log("verified module resolver smoke ok");
