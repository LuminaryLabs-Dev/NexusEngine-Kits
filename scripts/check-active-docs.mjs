import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function markdownFiles(directory, exclude = () => false) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (exclude(entryPath, entry)) continue;
    if (entry.isDirectory()) output.push(...await markdownFiles(entryPath, exclude));
    else if (entry.name.endsWith(".md")) output.push(entryPath);
  }
  return output;
}

const rootDocs = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => path.join(root, entry.name));
const docs = await markdownFiles(
  path.join(root, "docs"),
  (entryPath, entry) => entry.isDirectory() && entry.name === "legacy"
);
const activeDocs = [...rootDocs, ...docs];
const staleWorkflow = [];
const brokenLinks = [];
const forbiddenWorkflow = [
  /ProtoKits remains the incubation/i,
  /Check the ProtoKit source/i,
  /A ProtoKit can (?:move|become)/i,
  /leave it in ProtoKits/i,
  /Full (?:kit )?behavior (?:is )?migrat(?:ed|es) from ProtoKits/i,
  /Unresolved behavior belongs in ProtoKits/i,
  /createRealtimeGame/,
  /nexusengine\/core-kits/,
  /nexusengine\.repository-registry\/1/
];

for (const filePath of activeDocs) {
  const source = await readFile(filePath, "utf8");
  if (forbiddenWorkflow.some((pattern) => pattern.test(source))) {
    staleWorkflow.push(path.relative(root, filePath));
  }

  for (const match of source.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    let target = match[1].trim();
    if (
      !target ||
      target.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) continue;
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    target = target.split("#", 1)[0];
    if (!target) continue;
    try {
      await access(path.resolve(path.dirname(filePath), decodeURIComponent(target)));
    } catch {
      brokenLinks.push(`${path.relative(root, filePath)} -> ${target}`);
    }
  }
}

assert.deepEqual(
  staleWorkflow,
  [],
  `Active docs contain the retired ProtoKit workflow:\n${staleWorkflow.join("\n")}`
);
assert.deepEqual(
  brokenLinks,
  [],
  `Broken active documentation links:\n${brokenLinks.join("\n")}`
);

console.log(`Active Kits docs ok: ${activeDocs.length} files.`);
