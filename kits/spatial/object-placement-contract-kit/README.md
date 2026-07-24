# object-placement-contract-kit

Renderer-neutral placement records and deterministic math for mesh-backed objects.

The kit standardizes a right-handed, Y-up, -Z-forward frame and records local
bounds, origin, pivot, named anchors, support contact, and world transform.
Render, collision, navigation, interaction, and evidence adapters can consume
the same serializable placement record.

The API can:

- create and revise placement records;
- transform local points and anchors into world space;
- align two named anchors;
- ground an object against a plane;
- fit an object inside world bounds; and
- validate contact, containment, bounds overlap, origins, pivots, and anchors.

The agent chooses what to place and iterates settings through visual review. The
kit performs deterministic math only.
