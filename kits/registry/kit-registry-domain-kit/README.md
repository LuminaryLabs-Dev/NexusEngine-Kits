# kit-registry-domain-kit

Canonical repository and kit manifest registry for NexusEngine domain composition.

## Domain

- Path: `n:registry:kits`
- API: `engine.n.kitRegistry`
- Compatibility aliases: `engine.kitManifest`, `engine.domainManifestRegistry`, and the pure `createKitRegistry()` helper
- Status: official

Stable source: `LuminaryLabs-Agents/NexusEngine-ProtoKits@e4e8a1e03943d1fb7ab1bfddb8837ad16b919c29`.

## Ownership

Owns serializable repository source identity, kit/domain/bundle manifests, strict ID/path/API collision checks, indexes, search, progress, snapshot, load, and reset.

Does not own network fetch, Git/GitHub resolution, caching, files, module import, code execution, kit installation, game behavior, or rendering. Those operations belong to installer/source adapters and hosts.

## Repository registry contract

```js
{
  schemaVersion: "nexusengine.repository-registry.v1",
  id: "LuminaryLabs-Dev/NexusEngine-Kits",
  owner: "LuminaryLabs-Dev",
  repository: "NexusEngine-Kits",
  requestedRef: "main",
  resolvedCommit: "40-character-sha",
  engineCompatibility: {},
  kits: [],
  domains: [],
  bundles: []
}
```

Trusted owner metadata defaults to `LuminaryLabs-Dev`, `LuminaryLabs-Agents`, and `LuminaryLabs-Publish`. Trust does not execute code and does not bypass schema, commit, or collision validation.

## Feature merge

The canonical owner preserves the useful union of:

- ProtoKits `kit-registry` pure lookup and compatibility queries.
- `kit-manifest-domain-kit` registration and validation.
- `domain-manifest-registry-domain-kit` domain/scope/provides indexes.
- NexusEngine-Editor labels, categories, children, search, and boundary descriptors.
- NexusEngine-Kits repository, domain, bundle, status, package, and CDN metadata.

The three old ProtoKit surfaces now delegate to this owner and no longer own separate registry state.

## Public API

```text
registerRegistry, registerManifest, registerMany, validateManifest
removeRegistry, get, getDomain, getBundle
list, search, listByDomain, listByScope, listByProvides
findByProvide, findByRequire, findCompatibleKits
listCategories, listDeployKits, listDomainBoundaries, listRegistries
getIndexes, getProgress, getState, getSnapshot, loadSnapshot, reset
```

## Validation

Real NexusEngine tests cover pinned and unpinned registry validation, trust metadata, strict collisions, compatibility aliases, snapshot/reset/load, graph/planner composition, cycle detection, and 1,000-manifest registry/graph scale.
