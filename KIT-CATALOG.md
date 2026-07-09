# KIT-CATALOG.md

NexusRealtime Kits is organized as an official first-party catalog.

The catalog is intentionally domain-based:

```txt
one kit      -> install one capability
one domain   -> install a related kit family
one bundle   -> install a reusable game stack
all          -> install the full migration bootstrap catalog
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
```

## Status Levels

```txt
migration-placeholder
  Catalog entry exists and can install as a metadata-only runtime kit.

candidate
  Behavior has migrated from ProtoKits but needs more validation.

official
  Stable enough for first-party use.

deprecated
  Kept for compatibility only.

archived
  No longer recommended.
```

The bootstrap catalog starts with placeholder entries so the installer, package exports, CDN references, docs, and future KitBuilder tooling have a stable target shape before every behavior migration is complete.

## Promotion Source

Each catalog kit should eventually trace back to either:

```txt
NexusRealtime-ProtoKits
NexusRealtime runtime contracts
new official kit work created directly here
```

Do not promote game-specific demo glue as an official kit.
