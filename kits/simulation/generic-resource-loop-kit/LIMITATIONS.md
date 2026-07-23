# Limitations

- The kit owns scalar resource meters, not inventory, economy, cargo, pressure policy, rendering, input, networking, or persistence transport.
- This deprecated kit cannot be installed beside Core Simulation because Core
  owns the compatibility API names.
- New code uses NexusEngine Core resource services.
- Browser CDN consumers must provide an import map for the bare `nexusengine` dependency.
