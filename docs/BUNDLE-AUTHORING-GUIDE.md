# Bundle Authoring Guide

A bundle is a curated install stack.

Bundles compose domains and kits for a reusable game or app shape.

A bundle should not own new gameplay rules. If new behavior is needed, create or update a kit.

## Bundle shape

```txt
bundles/<bundle-name>/
├─ README.md
├─ bundle.json
├─ index.js
└─ examples/
```

## Good bundles

```txt
default-game-stack
aerial-game-stack
rpg-game-stack
defense-game-stack
xr-authoring-stack
lightweight-web-stack
```
