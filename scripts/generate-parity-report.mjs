import fs from "node:fs";

const status = JSON.parse(fs.readFileSync(new URL("../parity/parity-status.json", import.meta.url), "utf8"));
const rows = Object.entries(status.kits ?? {}).map(([kitId, entry]) => `| ${kitId} | ${entry.status} | ${entry.target} |`);
const output = `# Parity Report\n\n| Kit | Status | Target |\n|---|---|---|\n${rows.join("\n")}\n`;
fs.writeFileSync(new URL("../parity/parity-report.md", import.meta.url), output);
console.log("parity report generated", { kits: rows.length });
