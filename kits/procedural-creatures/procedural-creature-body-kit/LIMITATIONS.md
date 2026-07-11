# Limitations

- Version 0.1.0 implements the theropod archetype only.
- Body parts share one descriptor and index buffer but are not welded into one watertight manifold.
- Generated normals are procedural and do not replace authored normal maps.
- The pose helper is a lightweight gait descriptor, not a full animation graph.
- Collision output is a recommendation and must be implemented by a physics adapter.
- Three.js, WebGL, native renderer, and asset-export adapters are outside this kit.
- Official promotion requires validation with at least two additional body plans.
