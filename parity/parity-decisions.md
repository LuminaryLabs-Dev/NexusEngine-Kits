# Parity Decisions

This repo is a clean rebuild, not a direct copy of ProtoKits.

## Decisions

- ProtoKits remains the reference and incubation repo.
- NexusEngine Kits rebuilds official replacements with stronger manifests, tests, docs, and install paths.
- Placeholder entries may exist only to stabilize catalog and CDN paths before behavior parity is complete.
- A kit is not official until behavior, docs, manifest, and smoke checks are present.
- If a source ProtoKit is too broad, the replacement must be split by domain.
- If a source ProtoKit is game-specific, the replacement should become a preset or adapter, not a core kit.
- `generic-resource-loop-kit` is the canonical runtime resource-meter collection; pressure policy and resource-pressure compatibility remain separate owners until their own parity-backed migrations.
- Default installation includes official behavior only; placeholder metadata remains discoverable but cannot masquerade as implementation.

## First rebuild wave

The first rebuild wave focuses on small atomic services because they produce the cleanest installer, domain, and test patterns.

The first official promotion is `generic-resource-loop-kit` from ProtoKits commit `9da1fdb979a878dff8f50565fec4a4952e58af5e`.
