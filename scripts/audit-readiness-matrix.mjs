import { createAudit, exists, readJson } from "./audit-utils.mjs";

const audit = createAudit("Readiness Matrix Audit");
const catalog = readJson("kit-catalog.json");

for (const manifest of catalog.manifests ?? []) {
  const status = manifest.status;
  const folder = ["kits", manifest.domain, manifest.id];
  if (status === "candidate" || status === "official" || status === "deprecated") {
    if (!manifest.realBehavior) audit.error(`${manifest.id} is ${status} but not marked as real behavior`);
    if (!exists(...folder, "README.md")) audit.error(`${manifest.id} is ${status} but missing README.md`);
    if (!exists(...folder, "kit.json")) audit.error(`${manifest.id} is ${status} but missing generated kit.json`);
    if (!exists(manifest.proof?.parity ?? "missing")) audit.error(`${manifest.id} is ${status} but missing source parity proof`);
    if (!exists(manifest.proof?.smoke ?? "missing")) audit.error(`${manifest.id} is ${status} but missing smoke proof`);
  }
  if (status === "official" || status === "deprecated") {
    if (!manifest.integrity) audit.error(`${manifest.id} is ${status} but has no generated integrity`);
    if (!manifest.packageExport) audit.error(`${manifest.id} is ${status} but has no package export`);
  }
  if (status === "official") {
    if (!exists("tests", "domains", `${manifest.domain}-domain-smoke.mjs`)) audit.error(`${manifest.id} is official but ${manifest.domain} has no domain smoke`);
  }
  if (status === "migration-placeholder" && manifest.realBehavior) audit.error(`${manifest.id} is a placeholder but has real behavior evidence`);
}

audit.finish("readiness-matrix-report");
