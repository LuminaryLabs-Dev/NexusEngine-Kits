# Contracts

Contracts define the reliable shapes used by NexusEngine Kits.

This directory keeps the repo from becoming a loose plugin pile by defining:

- `kit.json`
- `domain.json`
- `bundle.json`
- install reports
- kit status values
- kit kinds
- kit stability values
- domain kinds
- repository registries and trusted source identity
- reproducible `nexusengine-kits.lock.json` files

Authoritative manifests live under `manifests/`; generated catalog and physical `kit.json` files are derived outputs.

The runtime engine remains in `NexusEngine`. These contracts define how this catalog describes, validates, and installs official kits.
