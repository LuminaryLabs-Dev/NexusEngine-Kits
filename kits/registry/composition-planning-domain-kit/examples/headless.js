import { createInstallPlan } from "../index.js";

const plan = createInstallPlan(
  { id: "example", kits: ["example-kit"] },
  { manifests: [{ id: "example-kit", domain: "example" }] }
);
console.log(plan);
