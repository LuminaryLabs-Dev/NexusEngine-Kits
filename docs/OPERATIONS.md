# Operations

## Local Verification

Install the locked development dependencies and run the complete repository gate:

```bash
npm ci
npm run progress
npm run check
```

`npm run check` validates generated output, self-lock integrity, catalogs, manifests, exports, ownership boundaries, active documentation, package imports, registry and installer behavior, domain and kit smokes, and audit reports.

## Catalog Changes

After changing an authoritative manifest or implementation:

```bash
npm run build:catalog
git diff --check
npm run check
```

Review every generated change. Generated files must agree with `manifests/`; they are not a second source of truth.

## Packaging Check

```bash
npm pack --dry-run --json
```

This verifies the package payload without publishing. At the documented revision the dry-run succeeds, while the public npm registry has no `@luminarylabs/nexusengine-kits` package.

## Continuous Integration

The repository maintains checks for the package, catalogs, CDN paths, parity reporting, generated-catalog reconciliation, and the agriculture domain. The exact pre-documentation `main` revision passed all six workflows that ran for it.

Workflow success is separate from npm publication, a Git tag, or a GitHub release. None of those release proofs currently exists.

## Release Boundary

Before a release:

- run the complete local gate and relevant workflows;
- confirm the version and package payload;
- pin CDN examples to an immutable release reference;
- verify every official export and generated integrity value;
- add release notes and a tracked license text; and
- verify the published package or release artifact independently.

Do not publish, tag, deploy, or change repository settings as an incidental documentation or kit change.
