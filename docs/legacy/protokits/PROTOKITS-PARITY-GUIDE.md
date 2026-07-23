# ProtoKits Parity Guide

Use ProtoKits as the behavioral reference, not as a folder structure to copy.

## Parity checklist

For each rebuilt kit:

- source ProtoKit path is known
- target Kit path is known
- public factory is documented
- resources are matched or intentionally changed
- events are matched or intentionally changed
- snapshot/reset behavior is defined when stateful
- headless smoke exists
- browser CDN example exists
- `source-parity.md` records differences

## Intentional differences

A clean rebuild may rename unclear concepts, split broad kits, turn game-specific behavior into presets, or turn host/platform behavior into adapters.
