# Release Checklist

Use this before tagging or publishing NexusRealtime Kits.

## Required checks

- `npm test` passes.
- `npm run check:catalog` passes.
- `npm run check:manifests` passes.
- `npm run check:exports` passes.
- Parity report is current when parity changed.
- CDN index is current when catalog paths changed.

## Documentation checks

- README reflects current status.
- KIT-CATALOG.md reflects domains and bundles.
- KIT-INSTALLER.md reflects installer API.
- REBUILD-PARITY.md reflects parity status.
- First-wave kit READMEs are updated.

## Release checks

- Version is updated.
- Release notes are written.
- CDN examples use a tag or commit pin.
- Package export map includes every official export.
- Placeholder status is clearly marked.

## After release

- Update docs from branch CDN to tagged CDN.
- Update ProtoKits migration notes.
- Update parity report.
