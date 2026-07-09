# KIT-CATALOG.md

NexusEngine Kits is organized as an official first-party catalog.

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
  Catalog entry exists for discovery but default installation rejects it.

candidate
  Behavior has migrated from ProtoKits but needs more validation.

official
  Stable enough for first-party use.

deprecated
  Kept for compatibility only.

archived
  No longer recommended.
```

The bootstrap catalog starts with placeholder entries so package, domain, documentation, and future tooling have a stable target shape. Only official entries participate in default creation and installation.

## Promotion Source

Each catalog kit should eventually trace back to either:

```txt
NexusEngine-ProtoKits
NexusEngine runtime contracts
new official kit work created directly here
```

Do not promote game-specific demo glue as an official kit.
