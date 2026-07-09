import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import {
  createKitRegistryDomainKit,
  createRepositoryRegistry,
  mergeRegistries,
  validateRepositoryRegistry
} from "../../kits/registry/kit-registry-domain-kit/index.js";
import { createCapabilityGraphDomainKit } from "../../kits/registry/capability-graph-domain-kit/index.js";
import { createCompositionPlanningDomainKit } from "../../kits/registry/composition-planning-domain-kit/index.js";

const sourceCommit = "1234567890abcdef1234567890abcdef12345678";
const registry = createRepositoryRegistry({
  id: "LuminaryLabs-Dev/example-kits",
  owner: "LuminaryLabs-Dev",
  repository: "example-kits",
  requestedRef: "main",
  resolvedCommit: sourceCommit,
  kits: [
    { id: "input-intent-domain-kit", domain: "input-intent", domainPath: "n:input:intent", apiName: "inputIntent", status: "official", provides: ["input:intent"] },
    { id: "heat-pressure-domain-kit", domain: "heat-pressure", domainPath: "n:pressure:heat", apiName: "heatPressure", status: "candidate", requires: ["input:intent"], provides: ["pressure:heat"] },
    { id: "pressure-display-domain-kit", domain: "pressure-display", domainPath: "n:presentation:pressure", apiName: "pressureDisplay", status: "official", requires: ["pressure:heat"], provides: ["presentation:pressure"] }
  ],
  domains: [{ id: "pressure", kits: ["heat-pressure-domain-kit", "pressure-display-domain-kit"] }],
  bundles: [{ id: "pressure-stack", kits: ["input-intent-domain-kit"], domains: ["pressure"] }]
});

assert.equal(registry.trusted, true);
assert.equal(validateRepositoryRegistry(registry, { requirePinned: true }).ok, true);
assert.equal(validateRepositoryRegistry({ ...registry, resolvedCommit: null }, { requirePinned: true }).ok, false);
assert.equal(mergeRegistries([registry], { requirePinned: true }).kitOrder.length, 3);

const engine = createRealtimeGame({
  kits: [
    createCoreSimulationKit(),
    createKitRegistryDomainKit(),
    createCapabilityGraphDomainKit(),
    createCompositionPlanningDomainKit()
  ]
});

assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
engine.n.kitRegistry.registerRegistry(registry, { requirePinned: true });
assert.equal(engine.n.kitRegistry.list().length, 3);
assert.equal(engine.n.kitRegistry.search("heat")[0].id, "heat-pressure-domain-kit");
assert.equal(engine.n.kitRegistry.listRegistries()[0].resolvedCommit, sourceCommit);
assert.deepEqual(engine.n.kitRegistry.getProgress(), {
  total: 3,
  resolved: 2,
  remaining: 1,
  statuses: { official: 2, candidate: 1 }
});

engine.n.capabilityGraph.syncRegistry();
assert.deepEqual(engine.n.capabilityGraph.createInstallOrder(["pressure-display-domain-kit"]).installOrder, [
  "input-intent-domain-kit",
  "heat-pressure-domain-kit",
  "pressure-display-domain-kit"
]);

engine.n.compositionPlanning.registerRecipe({
  id: "pressure-stack-recipe",
  bundles: ["pressure-stack"],
  allowStatuses: ["official", "candidate"]
});
assert.deepEqual(engine.n.compositionPlanning.createInstallPlan("pressure-stack-recipe").installOrder, [
  "input-intent-domain-kit",
  "heat-pressure-domain-kit",
  "pressure-display-domain-kit"
]);

for (const api of [engine.n.kitRegistry, engine.n.capabilityGraph, engine.n.compositionPlanning]) {
  const snapshot = api.getSnapshot();
  api.reset();
  api.loadSnapshot(snapshot);
  assert.deepEqual(api.getSnapshot(), snapshot);
}

const cycleRegistry = createRepositoryRegistry({
  id: "LuminaryLabs-Agents/cycle-kits",
  owner: "LuminaryLabs-Agents",
  repository: "cycle-kits",
  resolvedCommit: sourceCommit,
  kits: [
    { id: "cycle-a-kit", domain: "cycle-a", domainPath: "n:cycle:a", apiName: "cycleA", status: "candidate", requires: ["cycle:b"], provides: ["cycle:a"] },
    { id: "cycle-b-kit", domain: "cycle-b", domainPath: "n:cycle:b", apiName: "cycleB", status: "candidate", requires: ["cycle:a"], provides: ["cycle:b"] },
    { id: "cycle-self-kit", domain: "cycle-self", domainPath: "n:cycle:self", apiName: "cycleSelf", status: "candidate", requires: ["cycle:self"], provides: ["cycle:self"] }
  ]
});
engine.n.kitRegistry.registerRegistry(cycleRegistry);
engine.n.capabilityGraph.syncRegistry();
const cycles = engine.n.capabilityGraph.findCycles();
assert.equal(cycles.length, 2);
assert.ok(cycles.some((cycle) => cycle.join("->") === "cycle-self-kit->cycle-self-kit"));
assert.equal(engine.n.capabilityGraph.createInstallOrder(["cycle-a-kit"]).ok, false);

assert.throws(() => engine.n.kitRegistry.registerRegistry(createRepositoryRegistry({
  id: "custom/conflict",
  owner: "custom",
  repository: "conflict",
  kits: [{ id: "other-kit", domain: "other", domainPath: "n:pressure:heat", apiName: "otherApi" }]
})), /domain path collision/);

const scaleRegistry = createRepositoryRegistry({
  id: "LuminaryLabs-Agents/scale-kits",
  owner: "LuminaryLabs-Agents",
  repository: "scale-kits",
  resolvedCommit: sourceCommit,
  kits: Array.from({ length: 1000 }, (_, index) => ({
    id: `scale-${index}-kit`,
    domain: `scale-${index}`,
    domainPath: `n:scale:${index}`,
    apiName: `scale${index}`,
    status: "experimental",
    provides: [`scale:${index}`]
  }))
});
const startedAt = performance.now();
const scaleEngine = createRealtimeGame({ kits: [createKitRegistryDomainKit({ registries: [scaleRegistry] }), createCapabilityGraphDomainKit()] });
scaleEngine.n.capabilityGraph.syncRegistry();
assert.equal(scaleEngine.n.kitRegistry.list().length, 1000);
assert.equal(Object.keys(scaleEngine.n.capabilityGraph.buildGraph().nodes).length, 1000);
assert.ok(performance.now() - startedAt < 5000, "1,000-manifest registry/graph proof must stay below five seconds");

const boundedEngine = createRealtimeGame({
  kits: [createKitRegistryDomainKit(), createCapabilityGraphDomainKit(), createCompositionPlanningDomainKit()]
});
for (let index = 0; index < 300; index += 1) {
  boundedEngine.n.compositionPlanning.registerRecipe({ id: `bounded-${index}`, kits: [] });
  boundedEngine.n.compositionPlanning.createInstallPlan(`bounded-${index}`);
  boundedEngine.n.compositionPlanning.validateComposition(`bounded-${index}`);
  boundedEngine.n.compositionPlanning.suggestMissingDomains(`bounded-${index}`);
}
const boundedState = boundedEngine.n.compositionPlanning.getState();
assert.equal(Object.keys(boundedState.recipes).length, 256);
assert.equal(Object.keys(boundedState.plans).length, 256);
assert.equal(Object.keys(boundedState.validations).length, 256);
assert.equal(Object.keys(boundedState.missingReports).length, 256);

console.log("registry control plane official smoke ok");
