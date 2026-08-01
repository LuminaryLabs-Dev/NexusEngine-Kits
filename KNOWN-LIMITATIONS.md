# Known Limitations

NexusEngine-Kits is the first-party registry for reusable behavior that is not
universal Core. It is not a complete game stack and catalog presence is not
proof that executable behavior exists.

## Current Registry

- 134 Kit records grouped under 21 external semantic Domains and 7 recipes.
- 23 official Kits are eligible for immutable-source hydration.
- 8 candidate, 8 scaffolded, and 95 migration-placeholder records remain
  metadata-only and non-installable through the public registry.
- Registry metadata can be discovered and planned without executing package
  code.
- An official record becomes installable only after its package, exact commit,
  canonical subpath, export, and SHA-256 source integrity are hydrated.

## Not Yet Provided

- Runtime package installation. Missing packages return an install requirement.
- A security sandbox for approved JavaScript. Imported code has host privileges.
- Complete implementations for placeholder and scaffold records.
- npm publication or release stability for this cutover.

## Ownership Boundary

Capabilities promoted to NexusEngine Core have no forwarding exports here.
Complete games and authored presets remain game-owned. ProtoKits is retired and
is used only as frozen source-lineage evidence.

## Rule

Metadata-only records are discoverable, not executable. `official` describes
proof status; immutable hydration determines installability.
