# Snapshot And Reset Guide

Stateful kits should define how their state can be inspected, reset, and restored.

## Snapshot

A snapshot is a serializable view of kit state.

## Reset

Reset returns the kit to a known state. Repeated reset calls should produce a stable result.

## Load snapshot

A future `loadSnapshot` path should restore state from a prior snapshot when a kit supports persistence or replay.

## Determinism

Stateful kits should avoid unstable values. If time matters, the kit should use runtime ticks or a foundation clock kit.
