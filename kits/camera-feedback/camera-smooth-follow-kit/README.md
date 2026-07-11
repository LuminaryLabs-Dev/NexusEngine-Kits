# Camera Smooth Follow Kit

Renderer-agnostic critically damped camera follow state for position, point of interest, and orientation.

## Owns

- persistent follow position and velocity
- persistent look point and velocity
- SmoothDamp timing and maximum-speed limits
- frame-time clamping
- teleport/reset detection
- quaternion orientation damping
- snapshot, restore, and reset

## Does not own

- Three.js or another renderer camera
- projection or field of view
- camera collision
- gameplay movement
- scene transitions
- input
- shake or cinematic sequencing

## Usage

```js
const kit = createCameraSmoothFollowKit();
const engine = createRealtimeGame({ kits: [kit] });
const follow = engine.n.cameraSmoothFollow.create({
  id: "player-camera",
  positionSmoothTime: 0.22,
  lookSmoothTime: 0.14,
  rotationSharpness: 12,
  maximumDeltaTime: 1 / 30
});

follow.reset({
  position: [0, 2.35, -6.6],
  lookPoint: [0, 1.15, 8]
});

const transform = follow.update({
  targetPosition: [1, 2.35, -5.6],
  targetLookPoint: [1, 1.15, 9],
  deltaTime: 1 / 60
});
```

`update()` returns one persistent transform descriptor. Consumers should read it immediately and use `getSnapshot()` when durable data is required.
