# Repository Profile

| Field | Verified value |
| --- | --- |
| Repository | `LuminaryLabs-Dev/NexusEngine-Kits` |
| Visibility | Public |
| Default branch | `main` |
| Package | `@luminarylabs/nexusengine-kits` |
| Package metadata version | `0.0.1` |
| Module format | ESM |
| NexusEngine peer | `0.0.4` |
| Catalog truth | `manifests/` |
| Main validation | `npm run check` |
| Progress command | `npm run progress` |
| Public npm package | Not found at the documented revision |
| Tags or GitHub releases | None |
| License | `package.json` declares MIT; no license text is tracked |

## Purpose

This repository is the first-party trusted registry and installer for reusable optional, niche, genre, and platform NexusEngine behavior. Core behavior, complete products, authored presets, and application tuning remain outside its ownership.

## Architecture

```text
manifests -> generated catalogs and factories -> registry planning
          -> trusted resolution and lockfile -> installer -> NexusEngine
```

Kits own atomic behavior, domains compose related kits, bundles compose reusable stacks, adapters cross host or protocol boundaries, and parity records preserve historical lineage.

## Verified Baseline

Baseline `c3ed05f5fe40613b3f0ebf2c630a5940cefbc4c2` matches remote `main`. The complete local `npm run check` passes, all six workflows triggered for that revision passed, and `npm pack --dry-run --json` produces a valid package payload.

Current progress is 149 inventoried, 26 official, 9 candidate, 9 scaffolded, 103 placeholder, and 2 deprecated entries. Run `npm run progress` before reporting these counts.

## Current Limitations

- Most catalog entries are not implemented behavior.
- No npm publication, Git tag, or GitHub release is proven.
- GitHub private vulnerability reporting is disabled.
- The package declares MIT without a tracked license text.
