import { createAudit, readJson } from "./audit-utils.mjs";

const audit = createAudit("Status Consistency Audit");
const parity = readJson("parity/parity-status.json");
const catalog = readJson("kit-catalog.json");
const allowed = new Set(["planned", "migration-placeholder", "scaffolded", "candidate", "official", "deprecated", "archived", "blocked", "experimental"]);
const manifests = new Map((catalog.manifests ?? []).map((manifest) => [manifest.id, manifest]));

if (Object.keys(parity.kits ?? {}).length !== manifests.size) audit.error("parity records and catalog manifests have different totals");
for (const [kitId, manifest] of manifests) {
  const entry = parity.kits?.[kitId];
  if (!entry) {
    audit.error(`${kitId} has no parity record`);
    continue;
  }
  if (!allowed.has(entry.status)) audit.error(`${kitId} has invalid parity status ${entry.status}`);
  if (entry.status !== manifest.status) audit.error(`${kitId} parity status ${entry.status} differs from manifest ${manifest.status}`);
  if (Boolean(entry.realBehavior) !== Boolean(manifest.realBehavior)) audit.error(`${kitId} realBehavior differs between parity and manifest`);
  if (entry.status === "official") audit.warn(`${kitId} is official; all generated proof gates must stay green`);
}

audit.finish("status-report");
