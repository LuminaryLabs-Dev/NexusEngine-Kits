import { exists, readJson, writeText } from "./audit-utils.mjs";

const parity = readJson("parity/parity-status.json");
const rows = [];

for (const [kit, entry] of Object.entries(parity.kits ?? {})) {
  rows.push({
    kit,
    status: entry.status,
    realBehavior: Boolean(entry.realBehavior) || kit === "completion-ledger-kit",
    target: entry.target,
    smoke: entry.target ? exists(entry.target, "smoke.test.mjs") : false,
    next: entry.next ?? "not specified"
  });
}

const md = [
  "# Readiness Report",
  "",
  "| Kit | Status | Real behavior | Smoke | Target | Next |",
  "|---|---|---:|---:|---|---|",
  ...rows.map((row) => `| ${row.kit} | ${row.status} | ${row.realBehavior ? "yes" : "no"} | ${row.smoke ? "yes" : "no"} | ${row.target} | ${row.next} |`),
  ""
].join("\n");

writeText("audit/reports/readiness-report.md", md);
console.log("readiness report generated", { kits: rows.length });
