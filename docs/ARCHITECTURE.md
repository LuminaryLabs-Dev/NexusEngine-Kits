# Architecture

## Purpose and Boundary

NexusEngine Kits owns reusable, non-Core NexusEngine behavior. It does not own atomic Core behavior, complete games, authored content, UI, product tuning, or product presets.

```text
public package exports
├── kits/       atomic runtime capabilities
├── domains/    related-kit compositions
├── bundles/    reusable multi-domain compositions
├── installer/  selection, planning, and installation
└── registry/   trust, integrity, resolution, and lockfiles

manifests/
└── authoritative kit, domain, bundle, and registry records
```

`package.json` defines the public import surface. Domain and bundle entrypoints compose existing factories; they do not introduce unrelated gameplay rules.

## Manifest-First Catalog

`manifests/` is authoritative. Catalogs, factory tables, CDN indexes, readiness records, progress reports, registry output, integrity values, and physical `kit.json` mirrors are generated projections.

A kit record identifies ownership, domain, status, entrypoint, factory, runtime requirements and providers, source lineage, integrity, and proof. The `realBehavior` boundary separates executable behavior from discoverable metadata.

## Planning and Installation

The installer expands selected kits, domains, or bundles into a dependency-ordered plan. Requirements already supplied by NexusEngine are recorded as Core dependencies rather than resolved to duplicate kits.

Default installation allows only `official` entries. Planning rejects disallowed status, missing real behavior, unresolved dependencies, missing public exports, and unavailable factories. Installation returns a structured report of installed kits, skipped entries, warnings, errors, sources, and Core dependencies.

## Registry Trust

Registry metadata is descriptive until it resolves to an immutable commit and passes validation. Trusted ownership alone does not authorize execution. External code additionally requires explicit approval, verified integrity, and an approved resolver.

An installation plan can be serialized into `nexusengine-kits.lock.json`. Replay validates the pinned registry and kit integrity before returning an executable plan.

## Readiness Boundary

The catalog distinguishes planned records, migration placeholders, scaffolds, candidates, official behavior, deprecated compatibility, and archives. Catalog presence or a package path alone does not prove runtime behavior.

The ProtoKit workflow is retired. Historical mappings remain lineage evidence. Behavior promoted into NexusEngine Core is removed from this package and documented through explicit migration guidance.
