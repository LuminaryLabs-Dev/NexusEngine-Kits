# Preset Documentation

A package preset is a reusable, product-neutral configuration package. A
complete game preset does not belong in NexusEngine-Kits.

It can define theme defaults, tuning values, content references, and a suggested kit stack.

A package preset must not define reusable rules that belong in a kit, authored
game content, product fiction, a complete game loop, or product-specific tuning.

## Shape

```txt
presets/<name>/
├─ README.md
├─ preset.json
├─ index.js
└─ examples/
```
