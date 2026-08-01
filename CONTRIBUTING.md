# Contributing to NexusEngine Kits

Contributions must remain reusable, non-Core NexusEngine behavior. Complete games, authored presets, product tuning, and atomic Core behavior belong in their respective repositories.

## Before Adding a Capability

Confirm that it:

- is reusable beyond one product;
- has one clear domain owner and atomic manifest identity;
- uses only public NexusEngine package entrypoints;
- is not a complete game, authored preset, or application-specific adapter glue; and
- has an honest readiness status backed by its implementation and proof.

The ProtoKit workflow is retired. Historical ProtoKit records may support lineage analysis but are not an authoring destination.

## Sources of Truth

- `manifests/` owns kit, domain, bundle, and registry records.
- `kits/<domain>/<kit>/kit.json` and catalog files are generated mirrors.
- `package.json` owns public package exports.
- `promotion-ledger.json` and parity records retain readiness and lineage evidence.

Do not hand-edit generated catalogs as independent truth. Update the authoritative manifest, regenerate, and review the complete diff.

## Required Kit Surface

Real kits normally provide:

```text
kits/<domain>/<kit-name>/
├── README.md
├── kit.json
├── index.js
├── smoke.test.mjs
├── LIMITATIONS.md
└── source-parity.md
```

A `candidate` must have executable behavior and focused proof. An `official` kit additionally requires complete ownership, public export, installer, domain, lineage, documentation, and readiness evidence. Metadata, a folder, or a placeholder factory is not implementation proof.

## Domains, Bundles, and Adapters

- A domain composes related kits without absorbing their internal behavior.
- A bundle composes reusable capabilities without adding authored gameplay.
- An adapter connects reusable behavior to a host, renderer, storage, input, or protocol surface without owning domain state.

## Validation

```bash
npm run build:catalog
npm run check
npm run progress
```

`npm run check` validates generated outputs, lockfiles, catalogs, manifests, exports, ownership boundaries, active documentation, package imports, registry and installer behavior, domain smokes, and audits. Report current counts from `npm run progress`, not from stale narrative text.

Use a review branch and pull request. Do not publish, tag, deploy, or change repository settings as part of an ordinary contribution.
