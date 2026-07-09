# Repository Memory

## Purpose

NexusEngine-Kits is the stable first-party kit catalog. It receives only validated, reusable capabilities from NexusEngine-ProtoKits and exposes them as individually installable kits, domain bundles, larger bundles, and inspectable package/CDN exports.

## Architecture

- `kits/`: stable or explicitly staged kit implementations grouped by domain.
- `domains/`: domain-level composition entrypoints.
- `bundles/`: multi-domain compositions.
- `installer/`: resolution and installation only; no gameplay ownership.
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

## Current Truth

The repository, package, public APIs, tests, documentation, and CDN examples use NexusEngine identity. The runtime resolves from `github:LuminaryLabs-Dev/NexusEngine#main`; old compatibility names are not retained.

Most catalog entries remain placeholders or scaffolds. `completion-ledger-kit` is recorded as candidate behavior. No other kit should be called stable without current readiness evidence.
