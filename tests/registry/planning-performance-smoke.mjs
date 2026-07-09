import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createInstallPlan } from "../../registry/index.js";

const commit = "1234567890abcdef1234567890abcdef12345678";
const kits = Array.from({ length: 1000 }, (_, index) => ({
  id: `chain-${index}-kit`,
  version: "1.0.0",
  status: "official",
  kind: "domain-service-kit",
  domain: "scale",
  domainPath: `n:scale:${index}`,
  apiName: `scale${index}`,
  factory: `createScale${index}Kit`,
  entry: `./chain-${index}.js`,
  module: { node: `./chain-${index}.js`, package: null, browser: null },
  integrity: `sha256-${index}`,
  environments: ["node"],
  requires: index === 0 ? [] : [`scale:${index - 1}`],
  provides: [`scale:${index}`],
  composes: [],
  realBehavior: true,
  source: {
    registryId: "LuminaryLabs-Agents/scale-kits",
    owner: "LuminaryLabs-Agents",
    repository: "scale-kits",
    requestedRef: commit,
    resolvedCommit: commit,
    path: `chain-${index}.js`
  }
}));
const registry = {
  schemaVersion: "nexusengine.repository-registry.v1",
  id: "LuminaryLabs-Agents/scale-kits",
  owner: "LuminaryLabs-Agents",
  repository: "scale-kits",
  requestedRef: commit,
  resolvedCommit: commit,
  kits,
  domains: [{ id: "scale", kits: kits.map((kit) => kit.id) }],
  bundles: []
};

const startedAt = performance.now();
const plan = createInstallPlan({ kits: ["chain-999-kit"] }, { registry });
const elapsedMs = performance.now() - startedAt;
assert.equal(plan.ok, true);
assert.equal(plan.installOrder.length, 1000);
assert.equal(plan.installOrder[0], "chain-0-kit");
assert.equal(plan.installOrder.at(-1), "chain-999-kit");
assert.ok(elapsedMs < 5000, `1,000-manifest planning took ${elapsedMs.toFixed(1)}ms`);

console.log("1,000-manifest planning performance smoke ok", { elapsedMs });
