# Source parity

Initial source proof: `LuminaryLabs-Publish/PrehistoricRush` patch and chunk generation before promotion.

The promoted kit extracts only reusable control behavior:

- deterministic patch identity
- active/retained/prefetch lifecycle
- in-memory cache
- generation queue
- optional worker executor
- activation budget

PrehistoricRush keeps its terrain, route, tree, grass, pickup, collider, worker, and Three.js adapters.
