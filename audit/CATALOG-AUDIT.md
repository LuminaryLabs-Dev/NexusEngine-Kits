# Catalog Audit

Catalog audit checks that catalog entries have valid install surfaces.

## Checks

- domains listed in kit catalog have domain entrypoints
- domains listed in domain catalog have folders and entrypoints
- bundles listed in bundle catalog have entrypoints
- first-wave kits have physical folders and expected files

Run:

```txt
npm run audit:catalog
```
