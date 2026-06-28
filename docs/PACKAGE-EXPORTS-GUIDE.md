# Package Exports Guide

Package exports define stable import paths for the catalog.

Every official kit should eventually have an explicit export. Wildcard exports are useful during rebuild, but explicit exports are better for public usage.

## Export groups

- root entrypoint
- installer entrypoint
- bundle entrypoints
- domain entrypoints
- kit entrypoints
