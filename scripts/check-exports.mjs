import * as root from "../src/index.js";

const required = [
  "createNexusEngineKitInstaller",
  "createAllNexusEngineKits",
  "createCompletionLedgerKit",
  "createGenericResourceLoopKit",
  "createSeededWorldPatchControllerKit",
  "createMessageWorkerExecutor",
  "createProtokitCore",
  "createSeedKit",
  "getKitProgress",
  "createRepositoryRegistry",
  "pullRegistry",
  "mergeRegistries",
  "createCapabilityGraph",
  "createInstallPlan"
];

for (const name of required) {
  if (typeof root[name] !== "function") {
    throw new Error(`Missing export: ${name}`);
  }
}

console.log("exports ok", required);
