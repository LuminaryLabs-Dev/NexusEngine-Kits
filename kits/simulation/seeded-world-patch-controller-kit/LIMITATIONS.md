# Limitations

- The default cache is memory-only and does not persist through IndexedDB or files.
- Worker construction and worker message formats remain host-adapter responsibilities.
- The synchronous fallback still consumes main-thread time while each individual patch is generated.
- Snapshots preserve controller configuration and lifecycle metadata, not generated patch payloads.
- The controller does not merge GPU uploads or guarantee renderer frame time.
- Patch generators must be deterministic for cache reuse to remain trustworthy.
