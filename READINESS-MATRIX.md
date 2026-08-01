# Readiness Matrix

Readiness is evidence-based. It is separate from runtime installability.

| Status | Executable source | Required proof | Public registry behavior |
|---|---|---|---|
| migration-placeholder | no | identity, owner, lineage, intended boundary | metadata-only |
| scaffolded | partial | source location and limitations | metadata-only |
| candidate | yes | manifest, docs, smoke proof, partial parity | metadata-only |
| official | yes | manifest, docs, smoke proof, parity, Domain proof | eligible for immutable hydration |
| archived | no active work | retained historical disposition | metadata-only or omitted |

## Current Totals

| Status | Count |
|---|---:|
| official | 23 |
| candidate | 8 |
| scaffolded | 8 |
| migration-placeholder | 95 |
| total | 134 |

An official Kit is installable only after registry hydration resolves an exact
40-character commit, canonical package subpath and export, environment, and
matching SHA-256 source integrity.
