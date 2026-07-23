# Source Parity

Source: `LuminaryLabs-Dev/NexusEngine` commit
`06305727778d579ca18309221e60c3e41bd066c7`.

Each file in this folder preserves the matching former `src/<name>.js`
implementation. Imports of NexusEngine ECS and runtime-kit primitives now use
public package subpaths. Inter-kit imports remain local to this package.

No private NexusEngine source path is imported.

