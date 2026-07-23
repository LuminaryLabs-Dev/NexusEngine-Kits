# Known Limitations

NexusEngine Kits is a clean rebuild foundation, not a complete game stack.

## What works today

- Package exports exist for the installer, domains, bundles, and first-wave kit entrypoints.
- The installer can install a single kit, a domain, a bundle, or the full catalog.
- Audit scripts exist to detect contradictions between catalogs, package exports, docs, status, and behavior.
- `completion-ledger-kit` has real candidate behavior.
- `generic-resource-loop-kit` is deprecated because NexusEngine Core now owns
  the canonical resource service and compatibility APIs.
- The spatial domain is installable and smoke-testable.
- Default installation skips non-official entries; callers must explicitly opt into candidate or experimental statuses.

## What is placeholder-only

Most catalog entries are still metadata-backed placeholders. They are
discoverable for reporting and planning, but default installer paths do not
execute them as behavior.

## What is official

There are currently 26 official entries. Run `npm run progress` and inspect the
generated manifests for the current set.

## What is candidate

`completion-ledger-kit` has real candidate behavior, smoke coverage, docs, a
manifest, and lineage notes. It remains non-official until source behavior,
current downstream requirements, and domain validation are complete.

## What is not ready

- Full AAA game production.
- Broad gameplay stacks.
- Renderer adapters.
- Save/load beyond individual kit snapshots.
- Full catalog-wide behavior and downstream coverage.
- Tagged release stability.
- npm package publication.

## Rule

Installable does not always mean implemented. Catalog presence does not always mean real behavior.
