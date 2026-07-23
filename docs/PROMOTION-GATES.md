# Official Acceptance Gates

A candidate becomes an official NexusEngine Kit only when it passes these
gates. Its source may be a Core migration, an experiment lesson, a downstream
need, or a new approved implementation.

## Required Gates

- Domain is clear.
- Name follows kit naming grammar.
- Behavior is reusable beyond one game.
- Behavior is optional, niche, genre-specific, or platform-specific and
  therefore does not belong in Core.
- Runtime state is deterministic where state matters.
- Renderer and host behavior are decoupled.
- README exists.
- Install example exists.
- Domain bundle export exists.
- CDN path is documented.
- Test or smoke plan exists.
- Public NexusEngine imports contain no private source paths.
- Trusted registry and installer proof exists.
- Known limitations are explicit.

## Outcomes

```txt
accept as official
split
merge
rename
keep candidate
archive
```

Acceptance is not copying files. It establishes one owned, installable, proven
domain contract.
