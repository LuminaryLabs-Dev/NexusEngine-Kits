import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KIT_CATALOG,
  findKitDomain,
  listKitIds,
  resolveKitManifest
} from "../installer/kit-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!force && fs.existsSync(target)) throw new Error(`Refusing to overwrite ${relativePath}; pass --force for a deliberate rebuild.`);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function camelCase(value) {
  return String(value)
    .replace(/-kit$/, "")
    .replace(/[-_:]+([a-z0-9])/g, (_, letter) => letter.toUpperCase())
    .replace(/[^A-Za-z0-9_$]/g, "");
}

function domainPathFor(domain, kitId, existing) {
  if (existing?.domainPath) return existing.domainPath;
  const leaf = kitId.replace(/-kit$/, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return `n:${domain}:${leaf}`;
}

function sourceFor(kitId, existing = {}) {
  const source = existing.source ?? {};
  return {
    owner: source.owner ?? "LuminaryLabs-Agents",
    repository: source.repository ?? source.repo?.split("/")[1] ?? "NexusEngine-ProtoKits",
    requestedRef: source.requestedRef ?? "main",
    resolvedCommit: source.resolvedCommit ?? source.commit ?? null,
    path: source.path ?? `protokits/${kitId}/index.js`,
    parity: source.parity ?? null
  };
}

function blockerFor(status, kitId) {
  if (["official", "deprecated", "archived"].includes(status)) return null;
  if (status === "candidate") return `${kitId} still needs an exact stable source commit, complete feature-union parity, and all stable promotion gates.`;
  if (status === "scaffolded") return `${kitId} has only scaffold or metadata behavior and lacks validated source parity.`;
  if (status === "blocked") return `${kitId} has an unresolved explicit promotion blocker.`;
  return `${kitId} has no validated stable implementation or parity record.`;
}

function promotionFor(status, kitId) {
  const resolved = ["official", "deprecated", "archived"].includes(status);
  return {
    baseline: true,
    resolved,
    stages: {
      inventoried: true,
      sourceMapped: true,
      protoValidated: ["candidate", "official", "deprecated", "archived"].includes(status),
      candidate: ["candidate", "official", "deprecated", "archived"].includes(status),
      official: status === "official",
      deprecated: status === "deprecated",
      archived: status === "archived",
      blocked: status === "blocked"
    },
    nextCapability: resolved ? null : kitId,
    blocker: blockerFor(status, kitId)
  };
}

const oldDomainCatalog = readJson("domain-catalog.json");
const oldBundleCatalog = readJson("bundle-catalog.json");
const domainDetails = new Map(oldDomainCatalog.domains.map((domain) => [domain.id, domain]));

for (const kitId of listKitIds()) {
  const domain = findKitDomain(kitId);
  const resolved = resolveKitManifest(kitId);
  const folder = path.join(root, "kits", domain, kitId);
  const folderManifestPath = path.join(folder, "kit.json");
  const existing = fs.existsSync(folderManifestPath) ? JSON.parse(fs.readFileSync(folderManifestPath, "utf8")) : {};
  const implementationExists = fs.existsSync(path.join(folder, "index.js"));
  const entry = `./kits/${domain}/${kitId}/index.js`;
  const status = resolved.stability;
  const realBehavior = Boolean(resolved.realBehavior ?? existing.realBehavior);
  const source = sourceFor(kitId, existing);
  const apiName = existing.apiName ?? existing.runtime?.api ?? resolved.apiName ?? camelCase(kitId);

  writeJson(`manifests/kits/${kitId}.json`, {
    schemaVersion: "nexusengine.kit-manifest.v1",
    id: kitId,
    version: resolved.version ?? existing.version ?? "0.0.0",
    status,
    kind: resolved.kind ?? existing.kind ?? "runtime-kit",
    domain,
    domainPath: domainPathFor(domain, kitId, existing),
    parentDomainPath: `n:${domain}`,
    apiName,
    factory: resolved.factory,
    entry,
    packageExport: realBehavior ? `./${kitId}` : null,
    module: {
      package: implementationExists ? entry : null,
      node: implementationExists ? entry : null,
      browser: implementationExists
        ? `https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@{resolvedCommit}/kits/${domain}/${kitId}/index.js`
        : null
    },
    integrity: null,
    environments: ["node", "browser"],
    requires: existing.requires ?? resolved.requires ?? [],
    provides: existing.provides ?? resolved.provides ?? [`kit:${kitId}`, `domain:${domain}`],
    composes: [],
    realBehavior,
    source,
    runtime: existing.runtime ?? {
      api: apiName,
      snapshot: false,
      loadSnapshot: false,
      reset: false,
      deterministic: false
    },
    proof: {
      readme: fs.existsSync(path.join(folder, "README.md")) ? `kits/${domain}/${kitId}/README.md` : null,
      smoke: fs.existsSync(path.join(folder, "smoke.test.mjs")) ? `kits/${domain}/${kitId}/smoke.test.mjs` : null,
      parity: fs.existsSync(path.join(folder, "source-parity.md")) ? `kits/${domain}/${kitId}/source-parity.md` : null,
      limitations: fs.existsSync(path.join(folder, "LIMITATIONS.md")) ? `kits/${domain}/${kitId}/LIMITATIONS.md` : null
    },
    promotion: promotionFor(status, kitId)
  });
}

for (const [domainId, kits] of Object.entries(KIT_CATALOG.domains)) {
  const prior = domainDetails.get(domainId) ?? {};
  writeJson(`manifests/domains/${domainId}.json`, {
    schemaVersion: "nexusengine.domain-manifest.v1",
    id: domainId,
    label: prior.label ?? domainId,
    kind: prior.kind ?? "runtime-domain",
    status: "candidate",
    domainPath: `n:${domainId}`,
    entry: `./domains/${domainId}/index.js`,
    kits
  });
}

for (const bundle of oldBundleCatalog.bundles) {
  writeJson(`manifests/bundles/${bundle.id}.json`, {
    schemaVersion: "nexusengine.bundle-manifest.v1",
    id: bundle.id,
    label: bundle.id,
    status: "candidate",
    entry: `./${bundle.path}`,
    domains: bundle.domains,
    kits: []
  });
}

writeJson("manifests/registry.json", {
  schemaVersion: "nexusengine.repository-registry.v1",
  id: "LuminaryLabs-Dev/NexusEngine-Kits",
  owner: "LuminaryLabs-Dev",
  repository: "NexusEngine-Kits",
  requestedRef: "main",
  resolvedCommit: null,
  engineCompatibility: {
    package: "nexusengine",
    range: ">=0.0.3",
    testedCommit: "d76d54f862f9c6c6a115471b483dc1afda3f6b4a"
  },
  promotion: {
    baselineCount: 120,
    approvedAdditionIds: [
      "kit-registry-domain-kit",
      "capability-graph-domain-kit",
      "composition-planning-domain-kit"
    ],
    activeCapability: "kit-registry-domain-kit"
  },
  metadata: {
    sourceTemplate: true,
    resolvedCommitRule: "A metadata transport must replace null with the immutable fetched commit before trust or installation.",
    trustedOwners: ["LuminaryLabs-Dev", "LuminaryLabs-Agents", "LuminaryLabs-Publish"]
  }
});

console.log("authoritative manifests seeded", {
  kits: listKitIds().length,
  domains: Object.keys(KIT_CATALOG.domains).length,
  bundles: oldBundleCatalog.bundles.length
});
