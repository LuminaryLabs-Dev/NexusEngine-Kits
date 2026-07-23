# Bundle Authoring Guide

A bundle is a curated install stack.

Bundles compose domains and kits for a reusable capability stack.

A bundle does not own new gameplay rules, authored content, or a complete game.
If reusable non-Core behavior is missing, handle it as a separately reviewed
kit.

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
