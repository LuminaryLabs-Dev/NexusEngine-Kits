# Status Values

Use status values to mark readiness honestly.

## Canonical ladder

```txt
planned
migration-placeholder
scaffolded
candidate
official
deprecated
archived
```

## Definitions

`planned` means the kit/domain/bundle is intended but no folder or implementation exists yet.

`migration-placeholder` means an installable metadata kit exists, but real behavior is not rebuilt.

`scaffolded` means folders or docs exist, but behavior is incomplete.

`candidate` means real behavior exists with smoke coverage, but parity and domain validation are not fully complete.

`official` means behavior, docs, manifests, tests, parity, and domain smoke are complete.

`deprecated` means retained for compatibility.

`archived` means no longer active.

## Rule

Do not mark a kit official until behavior, docs, examples, tests, parity, and domain smoke are present.
