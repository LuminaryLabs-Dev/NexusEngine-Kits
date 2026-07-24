# Source Parity

Source: `LuminaryLabs-Dev/NexusEngine` commit
`06305727778d579ca18309221e60c3e41bd066c7`.

Migrated production owners:

- `src/fishing-kit.js` -> `index.js`
- fishing rendering in `src/renderers.js` -> `renderers.js`
- `fishingShaders` in `src/shaders.js` -> `shaders.js`
- `src/realism-kit.js` -> `realism.js`
- fishing-specific terrain binding -> `createFishingTerrainBinding`

No private NexusEngine source path is imported. Runtime dependencies resolve
through the public `nexusengine` package.
