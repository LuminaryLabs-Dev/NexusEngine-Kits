# Physics first slice

This candidate connects the existing Core owners to one concrete Rapier provider and one Three.js view. It is a working vertical slice, not completion of the full 0.0.5 matrix. Core remains package version 0.0.4 until the full release requirements pass.

```text
engine.tick(1/60)
  -> existing Simulation commit participant
  -> Rapier 0.19.0 executes the selected rigid-body profile
  -> Body Registry commits the bounded output batch
  -> Spatial receives the committed physicsTransform descriptors
  -> Physics Step retains one current frame and publishes contact/sensor events
  -> host calls Three view.render() after the tick succeeds
```

## Run

Use the exact Engine development commit pinned by this repository's lockfile. `npm ci --ignore-scripts --no-audit --no-fund` installs Engine plus the exact test providers. Run `npm run test:physics`. Then serve the repository root with `python -m http.server 8765 --bind 127.0.0.1` and open `/examples/physics-runtime/index.html` locally. Append `?manual&renderer=svg` to explicitly select Three's software SVG renderer; default `webgl2` fails rather than silently falling back when a context is unavailable.

`examples/physics-runtime/scene.mjs` shows explicit Core composition. The candidate exports are `./rapier-physics-provider-kit`, `./physics-runtime-adapter-kit`, and `./three-physics-view-kit`. The catalog lists candidates as non-installable by the official installer; direct reviewed imports are deliberate. No provider implementation or GPU/native handles are inserted into Core.

## Supported profile

The first profile uses one right-handed metre-scale world and one fixed step per engine tick. Static, dynamic, and velocity-based kinematic bodies are represented by the existing Core body records. Physical geometry supports box, sphere, capsule, cylinder and cone; a floor is a static box. Joints map fixed, hinge, ball/socket and distance-as-rope descriptors. The hinge profile requires matching local axes and identity anchor rotations. Raycasts return Core body/collider identities against the last simulated world. Collision and sensor enter/stay/exit results are translated to the selected Core trigger policy.

Rapier has one friction coefficient rather than separate static/dynamic coefficients. This profile therefore requires equal isotropic coefficients and rejects rolling/spinning friction, anisotropy, custom restitution thresholds, custom combine priority, collision groups, per-collider exclusions, and layers above 15. Native collider density is zero: explicitly authored Core body mass/inertia remain authoritative. Automatic joint break policies, drives, articulated bodies, water/buoyancy, wind, time scaling, regions, bounded-world policies, arbitrary shape casts, parallel jobs and additional providers remain outside this slice. Unsupported input is not silently approximated.

## State and failure behavior

Body records and revisions remain in `physicsBodyRegistry`; only the latest streaming retry is retained. Authored command receipts are not discarded. `physicsStep.commitFrame` likewise keeps one current frame rather than adding one command receipt per tick. Spatial owns the committed transform descriptors under the isolated `physicsTransform` namespace.

The adapter uses the existing Simulation transaction and explicitly enlists native provider state and Simulation service closures in the new Runtime tick checkpoint facility. Failed setter-based ECS changes, enlisted external state, query membership, and clock identity restore together. In-place mutation of stored references, unrelated unregistered closures, active sequence internals, network calls, already-delivered observer side effects, and pixels are not magically reversible. Render only after a successful tick; keep external effects outside the transactional simulation or provide their own checkpoint policy.

Host snapshots contain separately labeled `core`, `provider`, and `clock` sections. The provider section includes Rapier-native bytes and handle bindings; it is version-specific, not a renderer/engine portable Core schema. The adapter's snapshot scope is this physics composition, not an arbitrary whole game. Reset restores the initial accepted scene. Mutating authored state takes effect on the next engine tick. Additional bodies and colliders still require valid public references.

## Observed proof

Node tests execute actual `engine.tick()` calls for falling/ground response, friction, restitution, a pass-through sensor, raycast, hinge, 1,200-step repeatability, snapshot/replay/reset, late simulation failures, cleanup failures, and negative inputs. Two independent 1,200-step runs compare canonical hashes at every tick. They do not establish arbitrary cross-platform or all-provider parity.

Browser proof uses the same source modules and checks Core pose equals the rendered mesh pose, saves/restores the simulation, and compares screenshots. In the sandbox, browser policy blocked localhost navigation and WebGL context creation. The exact module graph was loaded offline with module-specifier rewriting only; Three r180 SVGRenderer generated real visible frames rasterized by Chromium. The proof recorded 333 actual engine ticks, zero page errors, and changed pixels between falling and settled states. WebGL hardware, XR and The Open Above are still unverified for this slice.

Reference provider behavior: [Rapier friction](https://rapier.rs/docs/user_guides/javascript/collider_friction/), [restitution](https://rapier.rs/docs/user_guides/javascript/collider_restitution/), [determinism](https://rapier.rs/docs/user_guides/javascript/determinism/), and [serialization](https://rapier.rs/docs/user_guides/javascript/serialization/). The implementation pins 0.19.0 rather than assuming current documentation guarantees an untested newer backend.

Offline browser test: `node scripts/prepare-offline-physics-browser.mjs`, then `python tests/physics/browser-proof.py`. This requires Python Playwright, Pillow, and Chromium; it never relaxes the browser network policy. An upstream Rapier initialization deprecation warning is recorded, not suppressed.
