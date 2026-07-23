# NexusEngine Kits Agent Rules

NexusEngine-Kits is the first-party trusted registry for reusable optional,
niche, genre, or platform behavior.

## Ownership

```txt
NexusEngine Core
  atomic + idempotent + fully reusable

NexusEngine-Kits
  reusable + non-Core

Experiment or game repository
  complete games + authored product behavior
```

Do not create or update ProtoKits. Historical source mappings are evidence, not
an active workflow.

## Work Loop

1. Read `goal.md`, `memory.md`, and the live manifests.
2. Confirm the capability is reusable and non-Core.
3. Reuse or extend the nearest existing owner.
4. Keep each manifest identity atomic even when source is collocated.
5. Use only public NexusEngine package entrypoints.
6. Add README, manifest, package export, registry entry, installer resolution,
   limitations, lineage, and focused proof.
7. Regenerate catalogs and run `npm run check`.
8. Report status, changed owners, validation, and remaining limitations.

## Boundaries

- Do not edit NexusEngine, experiments, or game repositories from this repo.
- Do not add a complete game or authored preset.
- Do not import private NexusEngine source paths.
- Do not treat metadata or a placeholder factory as working behavior.
- Do not make executable registry code available until trust, immutable source,
  integrity, collision, dependency, and status gates pass.
- Do not publish, push, release, or deploy without explicit approval.

## Required Kit Shape

```txt
kits/<domain>/<kit-name>/
├─ README.md
├─ kit.json
├─ index.js
├─ smoke.test.mjs
├─ LIMITATIONS.md
└─ source-parity.md
```

The exact structure may use a shared proof folder when multiple atomic manifest
identities intentionally share one implementation surface.
