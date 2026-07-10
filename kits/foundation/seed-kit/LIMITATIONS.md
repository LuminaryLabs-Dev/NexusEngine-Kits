# Limitations

- `maxStreams` is fixed at installation and snapshots must use the same limit.
- Stream IDs and seeds are normalized as non-empty strings.
- The service supplies deterministic pseudorandom streams, not cryptographic or nondeterministic entropy.
- Procedural generation, content policy, persistence transport, networking, rendering, and input remain consumer concerns.
- Browser CDN consumers must provide an import map for the bare `nexusengine` dependency.
