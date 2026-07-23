# What Installable Means

Executable installation always requires real allowed-status behavior. Metadata
may remain discoverable without being executable.

## Levels

- metadata-discoverable: the catalog can describe an unresolved entry.
- scaffold-installable: a folder or entrypoint exists, but behavior is incomplete.
- candidate behavior installable: real behavior exists with smoke tests.
- official behavior installable: behavior, docs, manifests, lineage, registry
  proof, and domain smoke are complete.

## Rule

Every doc must distinguish installability from implementation readiness.
