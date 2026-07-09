import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function integrityFor(bytes) {
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("base64")}`;
}

export function createNodeModuleResolver(options = {}) {
  const baseDirectory = path.resolve(options.baseDirectory ?? process.cwd());
  const importModule = options.importModule ?? ((url) => import(url));

  return async function resolveNodeModule(manifest) {
    const modulePath = manifest.module?.node ?? manifest.module?.package;
    if (!modulePath) throw new TypeError(`Node module ${manifest.id} has no package or local module path.`);
    if (!manifest.integrity) throw new TypeError(`Node module ${manifest.id} requires an integrity hash.`);
    const absolutePath = path.resolve(baseDirectory, modulePath.replace(/^\.\//, ""));
    const bytes = await fs.readFile(absolutePath);
    const actual = integrityFor(bytes);
    if (actual !== manifest.integrity) throw new TypeError(`Integrity mismatch for ${manifest.id}: expected ${manifest.integrity}, received ${actual}.`);
    const module = await importModule(pathToFileURL(absolutePath).href);
    const factory = module[manifest.factory] ?? module.default;
    if (typeof factory !== "function") throw new TypeError(`Module ${manifest.id} does not export ${manifest.factory}.`);
    return { factory, verified: true, verifiedIntegrity: actual, moduleUrl: pathToFileURL(absolutePath).href };
  };
}
