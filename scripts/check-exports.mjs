import * as root from "../src/index.js";

const required = [
  "createNexusEngineKitInstaller",
  "createAllNexusEngineKits",
  "createSeededWorldPatchControllerKit",
  "createMessageWorkerExecutor",
  "createCameraSmoothFollowKit",
  "createSeedKit",
  "getKitProgress",
  "pullRegistry",
  "hydrateCompositionRegistry",
  "createInstallPlan"
];

const removed = [
  "createCompletionLedgerKit",
  "createGenericResourceLoopKit",
  "createProtokitCore",
  "createRepositoryRegistry",
  "mergeRegistries",
  "createCapabilityGraph",
  "createKitRegistryDomainKit",
  "createCapabilityGraphDomainKit",
  "createCompositionPlanningDomainKit"
];

for (const name of required) {
  if (typeof root[name] !== "function") {
    throw new Error(`Missing export: ${name}`);
  }
}

for (const name of removed) {
  if (name in root) throw new Error(`Removed Core-owned export remains reachable: ${name}`);
}

console.log("exports ok", { required, removed });
