import { createAudit, exists, readJson } from "./audit-utils.mjs";

const audit = createAudit("Readiness Matrix Audit");
const parity = readJson("parity/parity-status.json");

const evidence = {
  "completion-ledger-kit": {
    domain: "spatial",
    realBehavior: true,
    hasDomainSmoke: exists("tests", "domains", "spatial-domain-smoke.mjs")
  }
};

for (const [kit, entry] of Object.entries(parity.kits ?? {})) {
  const status = entry.status;
  const info = evidence[kit] ?? { domain: null, realBehavior: false, hasDomainSmoke: false };
  const domain = info.domain ?? kit.split("-")[0];
  const folder = ["kits", domain, kit];

  if (status === "candidate") {
    if (!info.realBehavior) audit.error(`${kit} is candidate but not marked as real behavior in readiness evidence`);
    if (!exists(...folder, "README.md")) audit.error(`${kit} is candidate but missing README.md`);
    if (!exists(...folder, "kit.json")) audit.error(`${kit} is candidate but missing kit.json`);
    if (!exists(...folder, "source-parity.md")) audit.error(`${kit} is candidate but missing source-parity.md`);
    if (!exists(...folder, "smoke.test.mjs")) audit.error(`${kit} is candidate but missing smoke.test.mjs`);
  }

  if (status === "official") {
    if (!info.realBehavior) audit.error(`${kit} is official but not marked real`);
    if (!info.hasDomainSmoke) audit.error(`${kit} is official but has no domain smoke evidence`);
  }

  if (status === "migration-placeholder" && info.realBehavior) {
    audit.error(`${kit} is migration-placeholder but has real behavior evidence`);
  }
}

audit.finish("readiness-matrix-report");
