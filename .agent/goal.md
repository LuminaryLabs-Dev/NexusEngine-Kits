# Agent Goal

Status: active

Promote only validated NexusEngine ProtoKit behavior into the stable catalog while preserving feature parity, domain boundaries, installability, and audit lineage.

## Current promotion

`generic-resource-loop-kit` is the first official baseline capability. The three-kit registry control plane is implemented and validated as separate official owners for registry state, capability graph, and composition planning; publication and its paired LuminaryLabs audit are the remaining steps for that milestone. The next baseline capability is `protokit-core`.

## Current promotion hold

The `webxr-hit-test-adapter` -> `spatial-surface-candidate` -> `anchor-descriptor` stack remains in ProtoKits. ProtoKits commit `e119eae81f6621c7bfbb027e3be7c32179ca1b9e` supplies real NexusEngine adapter, replay, snapshot/reset, and anchor composition proof. Stable review still requires two executable downstream host consumers and real-device WebXR wall/floor evidence.
