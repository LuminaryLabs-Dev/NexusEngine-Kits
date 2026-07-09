import fs from "node:fs";
import {
  createInstallPlan,
  createNexusEngineKitsLockfile,
  pullRegistry
} from "../registry/index.js";

const resolvedCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/i.test(resolvedCommit ?? "")) throw new TypeError("create-self-lock requires a full payload commit SHA.");
const template = JSON.parse(fs.readFileSync(new URL("../nexusengine.registry.json", import.meta.url), "utf8"));
const registry = await pullRegistry({ registry: template, resolvedCommit });
const selection = { bundles: ["all"] };
const plan = createInstallPlan(selection, { registry });
if (!plan.ok) throw new TypeError(`Cannot lock an invalid plan: ${JSON.stringify({ missing: plan.missing, rejected: plan.rejected, cycles: plan.cycles })}`);
const lockfile = createNexusEngineKitsLockfile({ registries: [registry], selection, plan });
fs.writeFileSync(new URL("../nexusengine-kits.lock.json", import.meta.url), `${JSON.stringify(lockfile, null, 2)}\n`);
console.log("self lockfile written", { resolvedCommit, kits: lockfile.resolution.kits.length });
