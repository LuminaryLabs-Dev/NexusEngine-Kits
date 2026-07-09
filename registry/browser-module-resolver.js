import { verifyIntegrity } from "./integrity.js";

const FULL_SHA = /^[a-f0-9]{40}$/i;

export function createBrowserModuleResolver(options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const importModule = options.importModule ?? ((url) => import(url));
  if (typeof fetchImpl !== "function") throw new TypeError("Browser module resolution requires fetch.");

  return async function resolveBrowserModule(manifest) {
    const url = manifest.module?.browser;
    if (!url || !FULL_SHA.test(manifest.source?.resolvedCommit ?? "") || !url.includes(manifest.source.resolvedCommit)) {
      throw new TypeError(`Browser module ${manifest.id} requires an immutable commit URL.`);
    }
    if (!manifest.integrity) throw new TypeError(`Browser module ${manifest.id} requires an integrity hash.`);
    const response = await fetchImpl(url);
    if (!response?.ok) throw new Error(`Browser module request failed (${response?.status ?? "unknown"}): ${url}`);
    const source = await response.arrayBuffer();
    const integrity = await verifyIntegrity(source, manifest.integrity, options);
    if (!integrity.ok) throw new TypeError(`Integrity mismatch for ${manifest.id}: expected ${integrity.expected}, received ${integrity.actual}.`);
    const module = await importModule(url);
    const factory = module[manifest.factory] ?? module.default;
    if (typeof factory !== "function") throw new TypeError(`Module ${manifest.id} does not export ${manifest.factory}.`);
    return { factory, verified: true, verifiedIntegrity: integrity.actual, moduleUrl: url };
  };
}
