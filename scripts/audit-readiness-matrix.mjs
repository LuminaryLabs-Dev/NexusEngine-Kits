import { createAudit, exists, readJson } from "./audit-utils.mjs";

const audit = createAudit("Readiness Matrix Audit");
const catalog = readJson("kit-catalog.json");

function relativePath(value) {
  return String(value ?? "").replace(/^\.\//, "");
}

for (const manifest of catalog.manifests ?? []) {
  const status = manifest.status;
  const readmePath = relativePath(manifest.proof?.readme);
  const smokePath = relativePath(manifest.proof?.smoke);
  const parityPath = relativePath(manifest.proof?.parity);
  const sourcePath = relativePath(manifest.source?.path);
  const hasParityProof = Boolean(parityPath) && exists(parityPath);
  const hasNativeSourceProof = manifest.source?.parity === "native"
    && Boolean(sourcePath)
    && exists(sourcePath);
  if (status === "candidate" || status === "official" || status === "deprecated") {
    if (!manifest.realBehavior) audit.error(`${manifest.id} is ${status} but not marked as real behavior`);
    if (!readmePath || !exists(readmePath)) audit.error(`${manifest.id} is ${status} but missing declared README proof`);
    if (
      !exists("manifests", "kits", `${manifest.id}.json`)
      && !exists("kits", manifest.domain, manifest.id, "kit.json")
    ) {
      audit.error(`${manifest.id} is ${status} but missing authoritative manifest`);
    }
    if (!hasParityProof && !hasNativeSourceProof) {
      audit.error(`${manifest.id} is ${status} but missing source parity proof`);
    }
    if (!smokePath || !exists(smokePath)) audit.error(`${manifest.id} is ${status} but missing smoke proof`);
  }
  if (status === "official" || status === "deprecated") {
    if (!manifest.integrity) audit.error(`${manifest.id} is ${status} but has no generated integrity`);
    if (!manifest.packageExport) audit.error(`${manifest.id} is ${status} but has no package export`);
  }
  if (status === "migration-placeholder" && manifest.realBehavior) audit.error(`${manifest.id} is a placeholder but has real behavior evidence`);
}

audit.finish("readiness-matrix-report");
