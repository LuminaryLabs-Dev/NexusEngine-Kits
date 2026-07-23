import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function filesUnder(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(entryPath));
    else output.push(entryPath);
  }
  return output;
}

const codeRoots = [
  "src",
  "kits",
  "domains",
  "bundles",
  "installer",
  "registry"
];
const privateCoreImports = [];

for (const codeRoot of codeRoots) {
  for (const filePath of await filesUnder(path.join(root, codeRoot))) {
    if (!/\.(?:m?js)$/i.test(filePath)) continue;
    const source = await readFile(filePath, "utf8");
    for (const match of source.matchAll(
      /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s*)?["']([^"']+)["']/g
    )) {
      if (
        /^nexusengine\/src(?:\/|$)/.test(match[1]) ||
        /NexusEngine\/src(?:\/|$)/.test(match[1])
      ) {
        privateCoreImports.push(
          `${path.relative(root, filePath)} -> ${match[1]}`
        );
      }
    }
  }
}

assert.deepEqual(
  privateCoreImports,
  [],
  `Kit code imports private NexusEngine files:\n${privateCoreImports.join("\n")}`
);

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const fishingManifest = JSON.parse(
  await readFile(path.join(root, "manifests", "kits", "fishing-kit.json"), "utf8")
);
const registry = JSON.parse(
  await readFile(path.join(root, "nexusengine.registry.json"), "utf8")
);

assert.equal(fishingManifest.status, "official");
assert.equal(fishingManifest.packageExport, "./fishing-kit");
assert.equal(packageJson.exports["./fishing-kit"], fishingManifest.entry);
assert.ok(
  registry.kits.some(
    (kit) =>
      kit.id === "fishing-kit" &&
      kit.status === "official" &&
      kit.realBehavior === true
  ),
  "Trusted registry does not expose fishing-kit as official real behavior"
);

for (const forbiddenExport of [
  "createReefRescueKit",
  "createShrinePuzzleKit",
  "createCorruptionWorldKit",
  "createTreeRunnerKit",
  "createMicroPlatformerKit"
]) {
  const rootSource = await readFile(path.join(root, "src", "index.js"), "utf8");
  assert.doesNotMatch(
    rootSource,
    new RegExp(`\\b${forbiddenExport}\\b`),
    `${forbiddenExport} must remain in a game repository`
  );
}

console.log(
  "Kit ownership boundaries ok: public Core imports only, trusted fishing manifest present, no complete game exports."
);
