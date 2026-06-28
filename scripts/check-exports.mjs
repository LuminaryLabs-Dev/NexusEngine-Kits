import * as root from "../src/index.js";

const required = [
  "createNexusRealtimeKitInstaller",
  "createAllNexusRealtimeKits",
  "createCompletionLedgerKit"
];

for (const name of required) {
  if (typeof root[name] !== "function") {
    throw new Error(`Missing export: ${name}`);
  }
}

console.log("exports ok", required);
