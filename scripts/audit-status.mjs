import { createAudit, readJson } from "./audit-utils.mjs";

const audit = createAudit("Status Consistency Audit");
const parity = readJson("parity/parity-status.json");
const completionManifest = readJson("kits/spatial/completion-ledger-kit/kit.json");
const resourceManifest = readJson("kits/simulation/generic-resource-loop-kit/kit.json");

const allowed = new Set(["planned", "migration-placeholder", "scaffolded", "candidate", "official", "deprecated", "archived"]);

for (const [kitId, entry] of Object.entries(parity.kits ?? {})) {
  if (!allowed.has(entry.status)) audit.error(`${kitId} has invalid parity status ${entry.status}`);
}

const completionStatus = parity.kits?.["completion-ledger-kit"]?.status;
if (completionManifest.stability !== "candidate") audit.error("completion-ledger-kit kit.json must be candidate while real behavior is under parity review");
if (completionManifest.source?.parity !== "candidate") audit.error("completion-ledger-kit source parity must be candidate");
if (completionStatus !== "candidate") audit.error("completion-ledger-kit parity-status.json must be candidate");

const resourceStatus = parity.kits?.["generic-resource-loop-kit"]?.status;
if (resourceManifest.stability !== "official") audit.error("generic-resource-loop-kit kit.json must be official");
if (resourceManifest.source?.parity !== "official") audit.error("generic-resource-loop-kit source parity must be official");
if (resourceStatus !== "official") audit.error("generic-resource-loop-kit parity-status.json must be official");

for (const [kitId, entry] of Object.entries(parity.kits ?? {})) {
  if (entry.status === "official") audit.warn(`${kitId} is official; verify docs, tests, parity, and domain smoke are all complete`);
}

audit.finish("status-report");
