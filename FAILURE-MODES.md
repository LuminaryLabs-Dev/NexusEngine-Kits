# Failure Modes

This repo can fail when documentation, catalogs, manifests, installer behavior, package exports, or actual kit behavior drift apart.

## Installer failures

- Kit ID resolves but only installs placeholder behavior.
- Duplicate kit IDs are not detected.
- Domain install hides failed child kit installs.
- Bundle install hides failed domain installs.

## Catalog failures

- Catalog lists a kit that has no intended domain.
- Catalog lists a domain that has no entrypoint.
- Catalog implies implementation when only placeholder install exists.

## Domain failures

- Domain docs imply all members are real when most are placeholders.
- Domain entrypoint and domain manifest list different members.
- Domain installs duplicate kit IDs.

## Bundle failures

- Bundle docs and bundle catalog disagree.
- Bundle includes domains that are not smoke-testable.

## Kit behavior failures

- README documents behavior that smoke tests do not assert.
- Candidate kit has no `kit.json`.
- Candidate kit has no smoke test.
- Stateful kit has no snapshot or reset story.

## Parity failures

- Parity says candidate but source comparison is incomplete.
- Source notes do not identify intentional differences.

## CDN and package failures

- Package export points to a missing file.
- CDN path resolves to scaffold but docs imply official behavior.

## Docs truth failures

- Docs use official language for placeholders.
- Docs list target files without noting they are planned or aliases.
