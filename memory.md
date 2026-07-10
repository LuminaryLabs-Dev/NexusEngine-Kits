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
- Deprecated compatibility kits require the same implementation, lineage, integrity, proof, package-export, and deterministic-runtime evidence as official kits, but remain excluded from default installs and require explicit `allowStatuses` opt-in.
- `seed-kit` owns world-seed configuration and bounded named deterministic streams at `engine.n.seedStream`; NexusEngine owns the seeded-random primitive, and procedural/content policy, persistence transport, rendering, networking, input, and entropy remain outside the kit.

## Current Truth

The repository, package, public APIs, tests, documentation, and CDN examples use NexusEngine identity. The runtime resolves from `github:LuminaryLabs-Dev/NexusEngine#main`; old compatibility names are not retained.

Most baseline entries remain placeholders or scaffolds. `generic-resource-loop-kit` and `seed-kit` are official baseline behaviors; `completion-ledger-kit` remains a candidate. `protokit-core` is resolved as a deprecated compatibility bridge from ProtoKits commit `9b0d74c57c29d04a9ba955ae41c8ca19cb2cd5d6`; NexusEngine remains the canonical owner of its core utility behavior. `seed-kit` is promoted from ProtoKits commit `11d245913ba4d30f3ce950eb5a17e1cc6e4aa1f5`. The registry, capability graph, and composition planner are three official approved additions promoted from ProtoKits commit `e4e8a1e03943d1fb7ab1bfddb8837ad16b919c29`. Current generated progress is 3 / 120 baseline resolved, 117 remaining, 3 / 3 additions resolved, 5 official kits, and 1 deprecated kit. Default installer, domain, bundle, and all-kit paths execute only real allowed-status factories and never synthesize empty placeholder runtimes.
