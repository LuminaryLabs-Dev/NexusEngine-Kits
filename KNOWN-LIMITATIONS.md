# Known Limitations

NexusRealtime Kits is a clean rebuild foundation, not a complete game stack.

## What works today

- Package exports exist for the installer, domains, bundles, and first-wave kit entrypoints.
- The installer can install a single kit, a domain, a bundle, or the full catalog.
- Audit scripts exist to detect contradictions between catalogs, package exports, docs, status, and behavior.
- `completion-ledger-kit` has real candidate behavior.
- The spatial domain is installable and smoke-testable.

## What is placeholder-only

Most catalog entries are still metadata-backed placeholders. A placeholder can be installed for shape, reporting, and planning, but it does not yet provide real gameplay or simulation behavior.

## What is candidate

`completion-ledger-kit` is the first real candidate kit. It has behavior, smoke coverage, docs, a manifest, and parity notes, but it is not official until full ProtoKits parity and domain validation are complete.

## What is not ready

- Full AAA game production.
- Broad gameplay stacks.
- Renderer adapters.
- Save/load beyond individual kit snapshots.
- Full ProtoKits parity.
- Tagged release stability.
- npm package publication.

## Rule

Installable does not always mean implemented. Catalog presence does not always mean real behavior.
