import * as T from 'three';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import R from '@dimforge/rapier3d-compat';
import { makeEngine, buildScene, addBody, attach } from './scene.mjs';
import { createThreePhysicsView } from '@luminarylabs/nexusengine-kits/three-physics-view-kit';
await R.init();
const engine = makeEngine();
buildScene(engine);
addBody(engine, { id: 'floor', type: 'static', position: [0, -.5, 0], shape: { type: 'box', halfExtents: [6, .5, 4] } });
addBody(engine, { id: 'box', position: [-2, 3.5, 0] });
addBody(engine, { id: 'ball', position: [0, 4.5, 0], shape: { type: 'sphere', radius: .5 }, material: 'bounce' });
addBody(engine, { id: 'sensor', type: 'static', position: [-2, 2, 0], shape: { type: 'box', halfExtents: [.8, .25, .8] }, sensor: true });
addBody(engine, { id: 'anchor', type: 'static', position: [2, 4, 0], shape: { type: 'sphere', radius: .18 }, sensor: true });
addBody(engine, { id: 'pendulum', position: [2, 2.5, 0], velocity: [2, 0, 0] });
engine.n.physicsConstraintRegistry.defineConstraint({ operationId: 'hinge', constraint: { id: 'hinge', type: 'hinge', bodyA: 'anchor', bodyB: 'pendulum', frames: { bodyB: { position: [0, 1.5, 0] } }, parameters: { axisA: [0, 0, 1], axisB: [0, 0, 1] } } });
const { runtime } = attach(engine, R);
const scene = new T.Scene();
scene.background = new T.Color(0x142739);
scene.add(new T.HemisphereLight(0xe1f5ff, 0x344358, 2.4));
const light = new T.DirectionalLight(0xffeed3, 3);
light.position.set(-3, 8, 6);
scene.add(light);
const camera = new T.PerspectiveCamera(45, 5 / 3, .1, 100);
camera.position.set(9, 8, 13);
camera.lookAt(0, 1.5, 0);
const view = createThreePhysicsView({ backend: new URLSearchParams(location.search || location.hash.slice(1)).get('renderer') ?? 'webgl2', SVGRenderer, THREE: T, engine, canvas: document.querySelector('canvas'), scene, camera, appearance: { floor: { color: 0x344a5b }, box: { color: 0x68d5be }, ball: { color: 0xf3bd69 }, pendulum: { color: 0xa999ed }, sensor: { color: 0x80b2e0 } } });
if (view.element !== document.querySelector('canvas'))
    document.querySelector('canvas').replaceWith(view.element);
let playing = !new URLSearchParams(location.search || location.hash.slice(1)).has('manual'), saved = null;
function status() { const tick = engine.getLastTickCommit(), box = engine.n.physicsBodyRegistry.getBody('box'); document.querySelector('#status').textContent = `Tick ${tick?.frame ?? 0}  |  box y = ${box.pose.position[1].toFixed(4)} m  |  draw calls ${view.getReceipt()?.drawCalls ?? 0}\nRapier 0.19.0 · Three r180 · first-slice proof, not full 0.0.5 release`; document.querySelector('#play').textContent = playing ? 'Pause' : 'Play'; }
function step(count = 1) { if (!Number.isSafeInteger(count) || count < 1 || count > 2000)
    throw new Error('Invalid step count'); for (let i = 0; i < count; i++)
    engine.tick(1 / 60); const receipt = view.render(); status(); return receipt; }
function reset() { runtime.reset(); step(); }
function save() { saved = runtime.getSnapshot(); return structuredClone(saved); }
function restore(value = saved) { if (!value)
    throw new Error('Save first'); runtime.loadSnapshot(value); const receipt = view.render(); status(); return receipt; }
document.querySelector('#play').onclick = () => { playing = !playing; status(); };
document.querySelector('#step').onclick = () => { playing = false; step(); };
document.querySelector('#save').onclick = () => { save(); status(); };
document.querySelector('#load').onclick = () => { playing = false; restore(); };
document.querySelector('#reset').onclick = () => { playing = false; reset(); };
step();
window.physicsProof = { engine, runtime, view, step, save, restore, reset, pause() { playing = false; status(); }, inspect() { return { tick: engine.getLastTickCommit(), bodies: engine.n.physicsBodyRegistry.listBodies(), transforms: runtime.getTransforms(), receipt: view.getReceipt(), meshBox: view.getMeshPosition('collider:box') }; } };
function animate() { if (playing) {
    try {
        step();
    }
    catch (error) {
        playing = false;
        document.querySelector('#status').textContent = error.message;
        throw error;
    }
} requestAnimationFrame(animate); }
requestAnimationFrame(animate);
