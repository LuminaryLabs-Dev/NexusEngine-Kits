import { getKitProgress } from "../installer/kit-catalog.js";

const progress = getKitProgress();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(progress, null, 2));
} else {
  console.log(`Baseline resolved:  ${progress.baselineResolved} / ${progress.baselineTotal}`);
  console.log(`Baseline remaining: ${progress.baselineRemaining}`);
  console.log(`Official:            ${progress.official}`);
  console.log(`Candidate:           ${progress.candidate}`);
  console.log(`Scaffolded:          ${progress.scaffolded}`);
  console.log(`Placeholder:         ${progress.placeholder}`);
  console.log(`Approved additions:  ${progress.approvedAdditionsResolved} / ${progress.approvedAdditionsTotal}`);
  console.log(`Active capability:   ${progress.activeCapability ?? "none"}`);
  console.log(`Blocked capabilities: ${progress.blocked}`);
  console.log(`Inventoried:          ${progress.stages.inventoried}`);
  console.log(`Source mapped:        ${progress.stages.sourceMapped}`);
  console.log(`Proto validated:      ${progress.stages.protoValidated}`);
}
