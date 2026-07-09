import { createAudit, exists } from "./audit-utils.mjs";

const audit = createAudit("Known Gaps Audit");

const required = [
  "KNOWN-LIMITATIONS.md",
  "IMPLEMENTATION-GAPS.md",
  "FAILURE-MODES.md",
  "PLACEHOLDER-MATRIX.md",
  "READINESS-MATRIX.md",
  "AAA-GAP-REGISTER.md",
  "docs/WHAT-INSTALLABLE-MEANS.md",
  "docs/WHAT-CANDIDATE-MEANS.md",
  "docs/WHAT-OFFICIAL-MEANS.md",
  "domains/spatial/LIMITATIONS.md",
  "kits/spatial/completion-ledger-kit/LIMITATIONS.md"
];

for (const file of required) {
  if (!exists(file)) audit.error(`known gap document missing: ${file}`);
}

audit.finish("known-gaps-report");
