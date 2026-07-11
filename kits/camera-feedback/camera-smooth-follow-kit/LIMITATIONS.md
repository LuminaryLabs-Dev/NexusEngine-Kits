# Limitations

- No camera collision, occlusion testing, shoulder switching, or rail constraints.
- Quaternion output assumes a camera-style look direction using a conventional up vector.
- The controller accepts one follow target and one look target per update.
- Large discontinuities reset through the teleport threshold instead of blending across the world.
- The live transform descriptor is reused for allocation control and should be treated as read-only.
