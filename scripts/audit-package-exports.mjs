import { createAudit, exists, pathFromPackageTarget, readJson } from "./audit-utils.mjs";

const audit = createAudit("Package Exports Audit");
const pkg = readJson("package.json");

for (const [exportName, target] of Object.entries(pkg.exports ?? {})) {
  if (typeof target !== "string") {
    audit.warn(`${exportName} uses non-string export target`);
    continue;
  }
  if (exportName.includes("*") || target.includes("*")) {
    audit.warn(`${exportName} uses wildcard export target ${target}; explicit exports are preferred for official kits`);
    continue;
  }
  const targetPath = pathFromPackageTarget(target);
  if (!exists(targetPath)) audit.error(`${exportName} points to missing file ${targetPath}`);
}

const expected = [
  "./installer",
  "./all",
  "./default-game-stack",
  "./aerial-game-stack",
  "./rpg-game-stack",
  "./defense-game-stack",
  "./xr-authoring-stack",
  "./lightweight-web-stack",
  "./domain-spatial",
  "./completion-ledger-kit"
];

for (const name of expected) {
  if (!pkg.exports?.[name]) audit.error(`expected public export is missing: ${name}`);
}

audit.finish("package-exports-report");
