# Limitations

- The kit owns scalar resource meters, not inventory, economy, cargo, pressure policy, rendering, input, networking, or persistence transport.
- Compatibility aliases remain for current consumers; new code should use `engine.n.resourceMeter`.
- Browser CDN consumers must provide an import map for the bare `nexusengine` dependency.
