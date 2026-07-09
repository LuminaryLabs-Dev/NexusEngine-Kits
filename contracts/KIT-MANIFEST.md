# Kit Manifest

One authoritative kit manifest lives under `manifests/kits/<kit-id>.json`.

Required identity and execution fields are `schemaVersion`, `id`, `version`, `status`, `kind`, `domain`, `domainPath`, `apiName`, `factory`, `entry`, `module`, `requires`, and `provides`.

Promotion fields record baseline/addition classification, independent stage flags, resolved state, next capability, and an exact blocker for unresolved entries. Stable manifests also require real behavior, source commit lineage, proof files, generated module integrity, package export, deterministic reset/snapshot declarations where applicable, and explicit environment support.

Physical `kits/<domain>/<kit>/kit.json` files are generated mirrors and are not edited directly.
