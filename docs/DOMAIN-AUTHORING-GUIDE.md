# Domain Authoring Guide

A domain is an install group. It composes related kits but does not own their internal behavior.

Each domain should eventually include:

```txt
README.md
domain.json
index.js
examples/domain-install.js
examples/browser-cdn.html
```

## Rules

- Domain entrypoints return kit arrays.
- Domain manifests list member kits.
- Domains must not hide unrelated behavior.
- Domains must not define new gameplay if that gameplay should be a kit.

## Validation

A domain is healthy when all listed kits import, instantiate, install together, and have no duplicate kit IDs.
