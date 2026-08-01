# Implementation Gaps

This file records current work without presenting planned metadata as behavior.

| Area | Current state | Remaining work | Failure behavior |
|---|---|---|---|
| Public registry | v3 metadata-only catalog with 134 Kits | publish immutable package commits for supported releases | unresolved records stay non-installable |
| Official Kits | 23 source-backed implementations | complete clean consumer and browser proof | hydration rejects missing or changed sources |
| Candidate Kits | 8 real implementations under review | finish parity and downstream proof | excluded from default installation |
| Scaffolded Kits | 8 partial implementations | finish behavior or demote to metadata-only | excluded from execution |
| Placeholders | 95 planning records | implement only after ownership and proof gates | no executable source is advertised |
| Recipes | 7 metadata compositions | add representative reconstruction proofs | planning identifies unavailable members before mutation |
| Distribution | local package proof only | npm publication and immutable release branches | consumers must use an explicitly supplied artifact |

Core-owned identities removed in the 0.0.4 cutover are not gaps in this
repository. Their migration destinations are recorded in
[`docs/0.0.4-CORE-PROMOTION-MIGRATION.md`](docs/0.0.4-CORE-PROMOTION-MIGRATION.md).

## Rule

A documented gap may remain. A registry record that implies unavailable
behavior may not.
