import assert from "node:assert/strict";

const root = await import("@luminarylabs/nexusengine-kits");
const installer = await import("@luminarylabs/nexusengine-kits/installer");
const registry = await import("@luminarylabs/nexusengine-kits/registry");
const nodeRegistry = await import("@luminarylabs/nexusengine-kits/registry/node");
const kitRegistry = await import("@luminarylabs/nexusengine-kits/kit-registry-domain-kit");
const capabilityGraph = await import("@luminarylabs/nexusengine-kits/capability-graph-domain-kit");
const composition = await import("@luminarylabs/nexusengine-kits/composition-planning-domain-kit");
const protokitCore = await import("@luminarylabs/nexusengine-kits/protokit-core");
const seedKit = await import("@luminarylabs/nexusengine-kits/seed-kit");
const instancedBatch = await import("@luminarylabs/nexusengine-kits/instanced-render-batch-kit");
const patchController = await import("@luminarylabs/nexusengine-kits/seeded-world-patch-controller-kit");
const cameraSmoothFollow = await import("@luminarylabs/nexusengine-kits/camera-smooth-follow-kit");
const domain = await import("@luminarylabs/nexusengine-kits/domain-registry");
const bundle = await import("@luminarylabs/nexusengine-kits/registry-control-plane");

for (const [name, value] of Object.entries({
  rootInstaller: root.createNexusEngineKitInstaller,
  installer: installer.createNexusEngineKitInstaller,
  pullRegistry: registry.pullRegistry,
  nodeResolver: nodeRegistry.createNodeModuleResolver,
  kitRegistry: kitRegistry.createKitRegistryDomainKit,
  capabilityGraph: capabilityGraph.createCapabilityGraphDomainKit,
  composition: composition.createCompositionPlanningDomainKit,
  protokitCore: protokitCore.createProtokitCore,
  rootProtokitCore: root.createProtokitCore,
  seedKit: seedKit.createSeedKit,
  instancedBatch: instancedBatch.createInstancedRenderBatchKit,
  patchController: patchController.createSeededWorldPatchControllerKit,
  workerExecutor: patchController.createMessageWorkerExecutor,
  cameraSmoothFollow: cameraSmoothFollow.createCameraSmoothFollowKit,
  rootCameraSmoothFollow: root.createCameraSmoothFollowKit,
  rootPatchController: root.createSeededWorldPatchControllerKit,
  rootSeedKit: root.createSeedKit,
  domain: domain.createRegistryDomainKits,
  bundle: bundle.createRegistryControlPlaneKits
})) {
  assert.equal(typeof value, "function", `${name} must be a package function export`);
}

for (const removedSubpath of [
  "@luminarylabs/nexusengine-kits/domain-mcp",
  "@luminarylabs/nexusengine-kits/mcp-domain-kit",
  "@luminarylabs/nexusengine-kits/mcp/node",
  "@luminarylabs/nexusengine-kits/object-placement-contract-kit"
]) {
  await assert.rejects(
    import(removedSubpath),
    /Package subpath .* is not defined by "exports"/,
    `${removedSubpath} must remain removed after its Core promotion`
  );
}

console.log("package import smoke ok");
