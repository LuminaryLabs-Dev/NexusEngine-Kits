# Limitations

- Version 1 supports right-handed, Y-up, -Z-forward coordinates only.
- Bounds checks use transformed axis-aligned bounds, not triangle-level contact.
- Surface contact uses one support anchor or the transformed local bounds.
- Alignment does not solve inverse kinematics, deformation, or multi-anchor
  constraints.
- Renderers and physics adapters must verify final mesh-level contact where
  higher precision is required.
