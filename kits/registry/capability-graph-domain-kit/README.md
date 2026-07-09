# capability-graph-domain-kit

Native NexusEngine capability dependency graph at `n:registry:capabilities` and `engine.n.capabilityGraph`.

Status: official. Stable source: `LuminaryLabs-Agents/NexusEngine-ProtoKits@e4e8a1e03943d1fb7ab1bfddb8837ad16b919c29`.

## Owns

- Canonical capability nodes derived from kit manifests.
- Requires/provides/composes edges and indexes.
- External provider tokens, missing requirements, clusters, and cycle detection.
- Deterministic dependency closure and topological install ordering.
- Serializable reset, snapshot, and exact restore.

## Does not own

Repository fetching, registry transport, module import, code execution, kit installation, child behavior, files, hosts, or rendering.

## API

```text
registerDomain, registerManifest, registerMany, remove, syncRegistry
setExternalProvides, buildGraph, listByProvides, listByDomain
findMissingRequires, findCycles, createInstallOrder, findClusters
getState, getSnapshot, loadSnapshot, reset
```

`engine.capabilityGraph` remains as a compatibility alias. New composition uses `engine.n.capabilityGraph`.

The real NexusEngine control-plane test proves registry synchronization, provider ordering, missing dependencies, cycles, snapshots, and 1,000-node scale.
