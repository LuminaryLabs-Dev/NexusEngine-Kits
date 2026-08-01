# Security Policy

## Reporting

GitHub private vulnerability reporting is not enabled for this repository at the documented revision. Do not publish exploit details, credentials, tokens, or private data in a public issue or pull request. Contact the repository maintainers through an established private channel and include the affected revision, package entrypoint, minimal reproduction, impact, and suggested mitigation.

No response-time, supported-version, reward, or coordinated-disclosure commitment is currently defined.

## Relevant Surfaces

This repository owns its registry, installer, manifests, catalogs, lockfiles, public package exports, and kit implementations. NexusEngine Core, third-party registries, network/CDN providers, and consuming applications remain separate security owners.

The retired ProtoKit workflow and historical parity records are not active execution surfaces.

## Implemented Controls

- Remote registry metadata resolves to a full immutable commit before trust or installation.
- Trusted ownership does not bypass integrity, collision, dependency, package-export, status, or executable-code checks.
- External registry code requires explicit opt-in, verified integrity, and an approved module resolver.
- Default installation allows only `official` entries with validated runtime behavior.
- Lockfiles retain resolved registries, commits, install order, modules, and integrity values.
- Browser module resolution binds imports to the resolved commit and verifies SHA-256 integrity.

## Safe Consumption

- Use public package entrypoints only.
- Pin remote or CDN use to a full immutable commit.
- Preserve the generated lockfile used for an installation.
- Treat catalog presence as metadata, not as proof of implementation or security review.
- Review non-default statuses and external-code approvals explicitly.

## Current Limitations

The repository has no tagged release or public npm publication. Most inventoried entries remain placeholders or scaffolds and are excluded from default execution. The repository template registry contains an unresolved commit placeholder until a trusted metadata transport supplies an immutable revision.
