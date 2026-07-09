# Parity Decisions

This repo is a clean rebuild, not a direct copy of ProtoKits.

## Decisions

- ProtoKits remains the reference and incubation repo.
- NexusRealtime Kits rebuilds official replacements with stronger manifests, tests, docs, and install paths.
- Placeholder entries may exist only to stabilize catalog and CDN paths before behavior parity is complete.
- A kit is not official until behavior, docs, manifest, and smoke checks are present.
- If a source ProtoKit is too broad, the replacement must be split by domain.
- If a source ProtoKit is game-specific, the replacement should become a preset or adapter, not a core kit.

## First rebuild wave

The first rebuild wave focuses on small atomic services because they produce the cleanest installer, domain, and test patterns.
