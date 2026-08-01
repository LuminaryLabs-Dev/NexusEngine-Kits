import { writeFile } from "node:fs/promises";
import {
  createInstallPlan,
  createNexusEngineKitsLockfile
} from "../registry/index.js";
import { NEXUSENGINE_REPOSITORY_REGISTRY } from "../installer/kit-catalog.js";
import { hydrateInternalRepositoryRegistry } from "../installer/internal-repository-registry.js";

const resolvedCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/i.test(resolvedCommit ?? "")) throw new TypeError("create-self-lock requires a full payload commit SHA.");
const registry = hydrateInternalRepositoryRegistry(NEXUSENGINE_REPOSITORY_REGISTRY, resolvedCommit);
const selection = { bundles: ["all"] };
const plan = createInstallPlan(selection, { registry });
if (!plan.ok) throw new TypeError(`Cannot lock an invalid plan: ${JSON.stringify({ missing: plan.missing, rejected: plan.rejected, cycles: plan.cycles })}`);
const lockfile = createNexusEngineKitsLockfile({ registries: [registry], selection, plan });
await writeFile(
  new URL("../nexusengine-kits.lock.json", import.meta.url),
  `${JSON.stringify(lockfile, null, 2)}\n`
);
console.log("self lockfile written", { resolvedCommit, kits: lockfile.resolution.kits.length });
