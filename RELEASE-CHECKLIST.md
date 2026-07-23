# Release Checklist

Use this before tagging or publishing NexusEngine Kits.

## Required checks

- `npm test` passes.
- `npm run check:catalog` passes.
- `npm run check:manifests` passes.
- `npm run check:exports` passes.
- Lineage and behavior report is current when source evidence changed.
- CDN index is current when catalog paths changed.

## Documentation checks

- README reflects current status.
- KIT-CATALOG.md reflects domains and bundles.
- KIT-INSTALLER.md reflects installer API.
- REBUILD-PARITY.md reflects lineage and behavior status.
- First-wave kit READMEs are updated.

## Release checks

- Version is updated.
- Release notes are written.
- CDN examples use a tag or commit pin.
- Package export map includes every official export.
- Placeholder status is clearly marked.

## After release

- Update docs from branch CDN to tagged CDN.
- Update migration notes when public imports changed.
- Update lineage and behavior reports.
