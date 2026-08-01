import { listKitIds } from "../installer/kit-catalog.js";

const kits = listKitIds();
const firstWave = [
  "seed-kit",
  "fishing-kit",
  "seeded-world-patch-controller-kit",
  "camera-smooth-follow-kit",
  "procedural-creature-body-kit",
  "instanced-render-batch-kit",
  "agriculture-domain-kit",
  "procedural-object-body-kit",
  "procedural-object-material-kit",
  "procedural-object-lod-kit",
  "procedural-object-capture-profile-kit"
];

const missing = firstWave.filter((kitId) => !kits.includes(kitId));
if (missing.length) throw new Error(`Missing first-wave kit entries: ${missing.join(", ")}`);
console.log("kit readiness seed ok", { catalog: kits.length, firstWave: firstWave.length });
