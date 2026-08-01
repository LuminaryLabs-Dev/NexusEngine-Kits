# Visual Identity

## Concept

The repository mark shows three independent modules inside a trusted catalog frame with a gold verification seal. The cover extends that metaphor into the actual workflow: manifests enter the catalog, pass validation, and become an installable composition.

The identity represents repository packaging and trust. It is not a visual style for downstream games or applications.

## Palette

| Role | Color |
| --- | --- |
| Registry frame | `#063B2C` |
| Primary module | `#0B6E69` |
| Secondary module | `#2A9D8F` |
| Verification | `#D7A526` |
| Paper | `#F4EEDB` |
| Warning accent | `#D96C4A` |

## Asset Contract

All reusable files live in [`docs/assets/brand/`](assets/brand/):

- `logo-transparent.png` is the full-resolution transparent mark.
- `logo-1024.png`, `logo-512.png`, and `logo-256.png` are padded derivatives.
- `logo-mask.png` and `logo-mask.svg` support controlled recoloring.
- `cover-1280x640.png` is the normalized repository cover.
- `social-card.png` combines the cover and mark without obscuring the workflow.
- `manifest.json` records settings, source hashes, output hashes, dimensions, and validation.

## Usage

Keep the complete mark visible with clear space around it. Do not crop, stretch, rotate, add glow or shadows, or imply that the mark certifies a third-party package. Preserve enough contrast for the off-white, green, teal, and gold shapes to remain distinguishable.

Downstream products own their own visual identity. Kit demonstrations, renderer descriptors, shaders, and example colors must not be generalized into a product-wide brand.

## Regeneration

Use the retained `logo-source.png` and `cover-source.png` with a no-crop image-pack workflow. Build into a staging directory, validate dimensions, alpha corners, mask coverage, and hashes, then inspect the transparent mark, cover, and social card before replacing any tracked asset.
