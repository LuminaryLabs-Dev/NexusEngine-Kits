import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createInstallPlan, createNexusEngineKitInstaller } from "../../installer/index.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const manifest = (id, fields = {}) => ({
  id,
  version: "1.0.0",
  status: "official",
  kind: "domain-service-kit",
  domain: id,
  domainPath: `n:test:${id}`,
  apiName: id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9_$]/g, ""),
  factory: `create${id.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9_$]/g, "")}`,
  entry: `./${id}.js`,
  module: { node: `./${id}.js`, browser: null, package: null },
  integrity: `sha256-${id}`,
  realBehavior: true,
  requires: [],
  provides: [`test:${id}`],
  ...fields
});
const registry = (id, kits) => ({
  schemaVersion: "nexusengine.repository-registry.v1",
  id: `LuminaryLabs-Agents/${id}`,
  owner: "LuminaryLabs-Agents",
  repository: id,
  requestedRef: commit,
  resolvedCommit: commit,
  kits,
  domains: [],
  bundles: []
});

let factoryCalls = 0;
const missingKit = manifest("missing-consumer-kit", { requires: ["test:absent"] });
const missingInstaller = createNexusEngineKitInstaller({
  registry: registry("missing-kits", [missingKit]),
  factoryRegistry: { [missingKit.id]: () => (factoryCalls += 1, { id: missingKit.id }) }
});
const missingResult = await missingInstaller.installKit({ installKit() {} }, missingKit.id);
assert.equal(missingResult.installed, false);
assert.equal(missingResult.report.errors[0].type, "missing-require");
assert.equal(factoryCalls, 0, "missing providers must reject before factory execution");

const cycleA = manifest("cycle-a-kit", { requires: ["test:cycle-b"], provides: ["test:cycle-a"] });
const cycleB = manifest("cycle-b-kit", { requires: ["test:cycle-a"], provides: ["test:cycle-b"] });
const cycleInstaller = createNexusEngineKitInstaller({
  registry: registry("cycle-kits", [cycleA, cycleB]),
  factoryRegistry: {
    [cycleA.id]: () => (factoryCalls += 1, { id: cycleA.id }),
    [cycleB.id]: () => (factoryCalls += 1, { id: cycleB.id })
  }
});
const cycleResult = await cycleInstaller.installKit({ installKit() {} }, cycleA.id);
assert.equal(cycleResult.installed, false);
assert.equal(cycleResult.report.errors[0].type, "dependency-cycle");
assert.equal(factoryCalls, 0, "cycles must reject before factory execution");

const coreConsumer = manifest("core-consumer-kit", { requires: ["n:core-simulation"] });
const coreRegistry = registry("core-consumer-kits", [coreConsumer]);
assert.equal(createInstallPlan({ kits: [coreConsumer.id] }, { registry: coreRegistry }).ok, false);
const coreEngine = createRealtimeGame({ kits: [createCoreSimulationKit()] });
const corePlan = createInstallPlan({ kits: [coreConsumer.id] }, { registry: coreRegistry, engine: coreEngine });
assert.equal(corePlan.ok, true);
assert.deepEqual(corePlan.coreDependencies, ["n:core-simulation"]);

const collision = manifest("collision-b-kit", { domainPath: "n:test:collision-a-kit" });
assert.throws(() => createNexusEngineKitInstaller({
  registry: registry("collision-kits", [manifest("collision-a-kit"), collision])
}), /domainPath|domain path collision/);

const apiCollision = manifest("api-collision-b-kit", { apiName: "apiCollisionAKit" });
assert.throws(() => createNexusEngineKitInstaller({
  registry: registry("api-collision-kits", [manifest("api-collision-a-kit"), apiCollision])
}), /apiName|api name collision/);

console.log("installer planning rejection smoke ok");
