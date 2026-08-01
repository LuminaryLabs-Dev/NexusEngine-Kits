import assert from "node:assert/strict";

const root = await import("@luminarylabs/nexusengine-kits");
const installer = await import("@luminarylabs/nexusengine-kits/installer");
const registry = await import("@luminarylabs/nexusengine-kits/registry");
const nodeRegistry = await import("@luminarylabs/nexusengine-kits/registry/node");
const seedKit = await import("@luminarylabs/nexusengine-kits/seed-kit");
const instancedBatch = await import("@luminarylabs/nexusengine-kits/instanced-render-batch-kit");
const patchController = await import("@luminarylabs/nexusengine-kits/seeded-world-patch-controller-kit");
const cameraSmoothFollow = await import("@luminarylabs/nexusengine-kits/camera-smooth-follow-kit");
const fishing = await import("@luminarylabs/nexusengine-kits/fishing-kit");

for (const [name, value] of Object.entries({
  rootInstaller: root.createNexusEngineKitInstaller,
  installer: installer.createNexusEngineKitInstaller,
  pullRegistry: registry.pullRegistry,
  hydrateRegistry: registry.hydrateCompositionRegistry,
  nodeResolver: nodeRegistry.createNodeModuleResolver,
  seedKit: seedKit.createSeedKit,
  instancedBatch: instancedBatch.createInstancedRenderBatchKit,
  patchController: patchController.createSeededWorldPatchControllerKit,
  workerExecutor: patchController.createMessageWorkerExecutor,
  cameraSmoothFollow: cameraSmoothFollow.createCameraSmoothFollowKit,
  fishing: fishing.createFishingKit,
  rootCameraSmoothFollow: root.createCameraSmoothFollowKit,
  rootPatchController: root.createSeededWorldPatchControllerKit,
  rootSeedKit: root.createSeedKit
})) {
  assert.equal(typeof value, "function", `${name} must be a package function export`);
}

for (const removedSubpath of [
  "@luminarylabs/nexusengine-kits/protokit-core",
  "@luminarylabs/nexusengine-kits/generic-resource-loop-kit",
  "@luminarylabs/nexusengine-kits/completion-ledger-kit",
  "@luminarylabs/nexusengine-kits/asset-descriptor-kit",
  "@luminarylabs/nexusengine-kits/kit-registry-domain-kit",
  "@luminarylabs/nexusengine-kits/capability-graph-domain-kit",
  "@luminarylabs/nexusengine-kits/composition-planning-domain-kit",
  "@luminarylabs/nexusengine-kits/domain-registry",
  "@luminarylabs/nexusengine-kits/registry-control-plane",
  "@luminarylabs/nexusengine-kits/domain-mcp",
  "@luminarylabs/nexusengine-kits/mcp-domain-kit",
  "@luminarylabs/nexusengine-kits/mcp/node",
  "@luminarylabs/nexusengine-kits/object-placement-contract-kit",
  "@luminarylabs/nexusengine-kits/kits/foundation/protokit-core"
]) {
  await assert.rejects(
    import(removedSubpath),
    /Package subpath .* is not defined by "exports"/,
    `${removedSubpath} must stay removed after Core promotion`
  );
}

console.log("package import smoke ok");
