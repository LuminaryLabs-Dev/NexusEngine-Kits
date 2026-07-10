# Agent Goal

Status: active

Promote only validated NexusEngine ProtoKit behavior into the stable catalog while preserving feature parity, domain boundaries, installability, and audit lineage.

## Current promotion

`generic-resource-loop-kit` is the first official baseline capability. The three-kit registry control plane is published and audited as separate official owners for registry state, capability graph, and composition planning. `protokit-core` is resolved as a deprecated, opt-in compatibility bridge while NexusEngine retains canonical core ownership. The next baseline capability is `seed-kit`.

## Current promotion hold

The `webxr-hit-test-adapter` -> `spatial-surface-candidate` -> `anchor-descriptor` stack remains in ProtoKits. ProtoKits commit `e119eae81f6621c7bfbb027e3be7c32179ca1b9e` supplies real NexusEngine adapter, replay, snapshot/reset, and anchor composition proof. Stable review still requires two executable downstream host consumers and real-device WebXR wall/floor evidence.
