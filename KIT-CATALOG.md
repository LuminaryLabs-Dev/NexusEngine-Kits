# KIT-CATALOG.md

NexusEngine Kits is organized as an official first-party catalog.

The catalog is intentionally domain-based:

```txt
one kit      -> install one capability
one domain   -> install a related kit family
one bundle   -> install a reusable capability stack
all          -> install every allowed-status implementation
```

## Domains

Current bootstrap domains:

```txt
foundation
input
spatial
progression
hazard-combat
economy-resources
building
camera-feedback
render-descriptors
aerial
xr
rpg-social
rpg-combat
generic-defense
route-extraction
project-deployment
simulation
registry
```

## Status Levels

```txt
migration-placeholder
  Catalog entry exists for discovery but default installation rejects it.

scaffolded
  Folder or wrapper exists, but stable runtime behavior and parity do not.

candidate
  Real behavior exists but needs more ownership or validation proof.

official
  Stable enough for first-party use.

deprecated
  Kept for compatibility only.

archived
  No longer recommended.

blocked
  Promotion has an exact unresolved blocker.
```

`manifests/kits`, `manifests/domains`, and `manifests/bundles` are authoritative. `npm run build:catalog` generates the JavaScript catalog, JSON catalogs, repository registry, factory table, CDN index, parity records, readiness ledger, progress, and physical `kit.json` mirrors. Only official entries participate in default creation and installation; deprecated runtime bridges require explicit `allowStatuses` opt-in.

## Evidence Source

Each catalog kit traces to one or more of:

```txt
historical source lineage
NexusEngine public runtime contracts
downstream experiment or game requirements
new approved implementation in this repository
```

Do not accept game-specific demo glue or a complete game as an official kit.
