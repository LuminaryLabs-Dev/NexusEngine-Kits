# Repository Memory

## Purpose

NexusEngine-Kits is the stable first-party kit catalog. It receives only validated, reusable capabilities from NexusEngine-ProtoKits and exposes them as individually installable kits, domain bundles, larger bundles, and inspectable package/CDN exports.

## Architecture

- `kits/`: stable or explicitly staged kit implementations grouped by domain.
- `domains/`: domain-level composition entrypoints.
- `bundles/`: multi-domain compositions.
- `installer/`: resolution and installation only; no gameplay ownership.
- `manifests/`: authoritative per-kit, per-domain, per-bundle, and repository records.
- `registry/`: metadata-only pull/trust, capability planning, lockfiles, integrity, and approved module resolver adapters.
- `contracts/`: manifest, status, and install-report contracts.
- `parity/`: source-to-stable feature and behavior evidence.
- `audit/` and readiness documents: visible limitations and promotion state.

## Conventions

- `main` is the active branch.
- Source game and project repositories are read-only evidence.
- ProtoKits is the experimental incubator; Kits is the stable promotion target.
- A smaller public API is acceptable, but stable promotion must preserve the useful source feature union.
- Domains communicate only through declared contracts, dependencies, events, inputs, outputs, and snapshots.
- Host, browser, renderer, and game-specific behavior stays in explicit adapters, presets, or source projects.
- Metadata placeholders remain visibly non-official and cannot substitute for behavior proof.
- Every pushed target change requires a pushed LuminaryLabs lineage and audit record.
- Catalog JavaScript, JSON catalogs, physical `kit.json` files, factory tables, parity, readiness, CDN indexes, and progress are generated from `manifests/` and must not become independent truth.
- `nexusengine.registry.json` is a source template with `resolvedCommit: null`; a metadata transport must inject and validate the immutable fetched commit because a Git commit cannot contain its own hash.
- Trusted registry owners are `LuminaryLabs-Dev`, `LuminaryLabs-Agents`, and `LuminaryLabs-Publish`; trust never bypasses pin, integrity, collision, dependency, status, or code-execution gates.

## Current Truth

The repository, package, public APIs, tests, documentation, and CDN examples use NexusEngine identity. The runtime resolves from `github:LuminaryLabs-Dev/NexusEngine#main`; old compatibility names are not retained.

Most baseline entries remain placeholders or scaffolds. `generic-resource-loop-kit` is the first official baseline behavior, promoted from ProtoKits commit `9da1fdb979a878dff8f50565fec4a4952e58af5e`; `completion-ledger-kit` remains a candidate. The registry, capability graph, and composition planner are three official approved additions promoted from ProtoKits commit `e4e8a1e03943d1fb7ab1bfddb8837ad16b919c29`. Current generated progress is 1 / 120 baseline resolved, 119 remaining, 3 / 3 additions resolved, and 4 official kits total. Default installer, domain, bundle, and all-kit paths execute only real allowed-status factories and never synthesize empty placeholder runtimes.
