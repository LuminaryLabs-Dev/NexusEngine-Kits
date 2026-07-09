import { createAudit, exists, pathFromPackageTarget, readJson } from "./audit-utils.mjs";

const audit = createAudit("Package Exports Audit");
const pkg = readJson("package.json");
const catalog = readJson("kit-catalog.json");

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
  "./completion-ledger-kit",
  "./generic-resource-loop-kit",
  "./kit-registry-domain-kit",
  "./capability-graph-domain-kit",
  "./composition-planning-domain-kit",
  "./domain-registry",
  "./registry-control-plane",
  "./registry",
  "./registry/node"
];

for (const name of expected) {
  if (!pkg.exports?.[name]) audit.error(`expected public export is missing: ${name}`);
}

for (const manifest of catalog.manifests ?? []) {
  if (!manifest.packageExport) continue;
  if (pkg.exports?.[manifest.packageExport] !== manifest.entry) {
    audit.error(`${manifest.id} package export ${manifest.packageExport} does not resolve to ${manifest.entry}`);
  }
}

audit.finish("package-exports-report");
