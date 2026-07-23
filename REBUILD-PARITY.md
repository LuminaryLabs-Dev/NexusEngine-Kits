# Historical Source And Behavior Lineage

The `parity/` path retains its historical name so generated records and source
references remain stable. It now records lineage and behavior coverage rather
than an active ProtoKit workflow.

Lineage proof means:

```txt
Historical or downstream behavior is identified.
An owned replacement exists or is explicitly unimplemented.
Public factory has a stable target.
Resources/events/systems are documented.
Tests or smoke plans exist.
CDN and package entrypoints are known.
Intentional differences are written down.
```

## Parity Files

```txt
parity/protokits-export-map.json
parity/protokits-to-kits-map.json
parity/parity-status.json
parity/parity-decisions.md
parity/parity-report.md
```

## Status Values

```txt
not-started
planned
scaffolded
partial
candidate
passing
blocked
archived
```

## Rule

Historical source can establish required behavior, but current ownership,
public contracts, tests, manifests, and downstream proof decide acceptance.
