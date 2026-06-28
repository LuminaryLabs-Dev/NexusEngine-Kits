import { listKitIds } from "../installer/kit-catalog.js";

const kits = listKitIds();
const firstWave = [
  "completion-ledger-kit",
  "spatial-interaction-kit",
  "objective-bridge-kit",
  "lock-group-kit",
  "damage-health-kit",
  "resource-node-kit",
  "build-placement-kit",
  "structure-runtime-kit",
  "asset-descriptor-kit",
  "diegetic-feedback-signal-kit"
];

const missing = firstWave.filter((kitId) => !kits.includes(kitId));
if (missing.length) throw new Error(`Missing first-wave kit entries: ${missing.join(", ")}`);
console.log("kit readiness seed ok", { catalog: kits.length, firstWave: firstWave.length });
