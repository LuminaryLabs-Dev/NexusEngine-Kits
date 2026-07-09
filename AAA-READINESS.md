# AAA Readiness

NexusRealtime Kits is not yet a complete AAA game stack.

It is a clean rebuild foundation for reaching AAA-scale kit composition.

## Current status

```txt
architecture scaffold: ready
installer shape: ready
catalog shape: ready
domain shape: ready
parity tracking: ready
full behavior parity: not ready
AAA production stack: not ready
```

## What AAA-ready means here

A kit ecosystem is AAA-ready only when it can support:

- real player rigs
- real camera rigs
- real interaction domains
- real combat/progression/resource loops
- real renderer-facing descriptors
- asset and performance budgets
- save/load and replay
- robust smoke and parity tests
- CDN and package install stability
- documented production usage

## Current blocking gaps

- Most catalog entries are still placeholders.
- Most kits do not yet have real behavior rebuilt from ProtoKits parity.
- Most domains do not yet have domain smoke tests.
- The installer does not yet provide production-grade dependency locking.
- The repo has not yet been tagged or published as a stable package.

## Vertical slice target

The first AAA-style proof should be a small vertical slice:

```txt
player rig
camera rig
spatial interaction
objective flow
health/resource state
build or pickup action
render descriptors
snapshot/reset
headless smoke
browser CDN demo
```

This repo becomes AAA-ready by making that slice real through official kits, not by adding one giant game framework.
