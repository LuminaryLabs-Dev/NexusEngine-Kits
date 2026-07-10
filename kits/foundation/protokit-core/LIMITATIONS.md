# Limitations

- This compatibility bridge is excluded from default registry, domain, bundle, and all-kit installs.
- Registry installation requires explicit `allowStatuses: ["official", "deprecated"]` opt-in.
- New code should use the replacement NexusEngine runtime-definition, core-utility, seeded-random, serialization, snapshot, and clock APIs.
- The kit intentionally owns no mutable domain state beyond versioned replacement metadata.
