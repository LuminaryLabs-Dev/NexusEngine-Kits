# Source Parity

Stable source: NexusEngine-ProtoKits commit `11d245913ba4d30f3ce950eb5a17e1cc6e4aa1f5`.

Preserved behavior:

- world seed and `seed:world`, `random:seeded`, and `random:stream` capabilities
- deterministic scoped streams and independent sibling order
- uint32/value, range, integer, boolean, choice, shuffle, and fork operations
- bounded stream lifecycle, draw accounting, and last value
- reset, atomic validation, exact snapshot, and continuation after load
- injected-runtime generic factory, generic aliases, state/configure, and semantic command compatibility

Purged by domain boundary rather than lost: the former generic runtime exposed input, world, vehicle, inventory, mission, camera, render, and diagnostics commands on every generic kit. No active seed consumer used those unrelated methods, and their behavior remains in their canonical domain kits.
