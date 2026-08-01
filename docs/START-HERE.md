# NexusEngine Kits Documentation

## Read In Order

1. [Repository README](../README.md)
2. [Architecture](ARCHITECTURE.md)
3. [What Official Means](WHAT-OFFICIAL-MEANS.md)
4. [Kit Authoring](KIT-AUTHORING-GUIDE.md)
5. [Registry Installation](REGISTRY-INSTALLATION.md)
6. [Operations and Testing](OPERATIONS.md)

## Ownership

This repository receives reusable behavior that is optional, niche,
genre-specific, or platform-specific. NexusEngine Core accepts only atomic,
idempotent, fully reusable behavior. Complete games and authored presets remain
in game repositories.

The ProtoKit workflow is retired. Historical migration and parity documents are
kept under `docs/legacy/protokits/`.

## Current Proof

Use:

```bash
npm run progress
npm run build:catalog
npm run check
```

Catalog metadata is not proof that behavior exists. Default installation paths
execute only allowed-status factories with validated public exports.
