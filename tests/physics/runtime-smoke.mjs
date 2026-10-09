import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import R from '@dimforge/rapier3d-compat';
import { makeEngine, buildScene, addBody, attach } from './fixture.mjs';
import { createPhysicsRuntimeAdapter, PhysicsContactEvent, PhysicsSensorEvent } from '@luminarylabs/nexusengine-kits/physics-runtime-adapter-kit';
await R.init();
const step = (e, n) => { for (let i = 0; i < n; i++)
    e.tick(1 / 60); };
function world({ gravity = [0, -9.81, 0], floorMaterial = 'normal' } = {}) { const e = makeEngine(); buildScene(e, { gravity }); addBody(e, { id: 'floor', type: 'static', position: [0, -.5, 0], material: floorMaterial, shape: { type: 'box', halfExtents: [100, .5, 100] } }); return e; }
const body = (e, id) => e.n.physicsBodyRegistry.getBody(id);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const hash = e => createHash('sha256').update(JSON.stringify(canonical({ bodies: e.n.physicsBodyRegistry.listBodies(), frame: e.n.physicsStep.getLastCompleted(), spatial: e.n.spatial.getDescriptors(), clock: e.getTickSnapshot().clock }))).digest('hex');
test('falling box, contact response, bounded penetration, body/Spatial agreement and events', () => {
    const e = world();
    addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r } = attach(e, R);
    const events = [];
    e.eventSurface(PhysicsContactEvent).subscribe(batch => events.push(...batch.map(x => x.payload.type)));
    step(e, 20);
    assert(body(e, 'box').pose.position[1] < 3);
    step(e, 340);
    assert(Math.abs(body(e, 'box').pose.position[1] - .5) < .015);
    assert(Math.abs(body(e, 'box').velocity.linear[1]) < .01);
    assert.deepEqual(r.getTransforms().box.position, body(e, 'box').pose.position);
    assert(events.includes('contact.enter'));
    assert(events.includes('contact.stay'));
    assert(e.getLastTickCommit().committed);
    r.dispose();
});
test('friction reduces sliding relative to zero-friction material', () => {
    const speed = [];
    for (const material of ['slippery', 'normal']) {
        const e = world({ floorMaterial: material });
        addBody(e, { id: 'box', position: [0, .51, 0], velocity: [3, 0, 0], material, sleep: false });
        const { runtime: r } = attach(e, R);
        step(e, 120);
        speed.push(Math.abs(body(e, 'box').velocity.linear[0]));
        r.dispose();
    }
    assert(speed[0] > 2.8);
    assert(speed[1] < .1);
    assert(speed[0] - speed[1] > 2.7);
});
test('restitution produces upward velocity after impact', () => {
    const e = world({ floorMaterial: 'slippery' });
    addBody(e, { id: 'ball', position: [0, 3, 0], shape: { type: 'sphere', radius: .5 }, material: 'bounce', sleep: false });
    const { runtime: r } = attach(e, R);
    let bounced = false;
    for (let i = 0; i < 110; i++) {
        e.tick(1 / 60);
        if (body(e, 'ball').velocity.linear[1] > 2)
            bounced = true;
    }
    assert(bounced);
    r.dispose();
});
test('sensor enter/exit does not stop a moving body; raycast returns a Core collider identity', () => {
    const e = world({ gravity: [0, 0, 0] });
    addBody(e, { id: 'sensor', type: 'static', position: [0, 2, 0], sensor: true });
    addBody(e, { id: 'ball', position: [-3, 2, 0], velocity: [2, 0, 0], shape: { type: 'sphere', radius: .25 }, sleep: false });
    const { runtime: r } = attach(e, R), events = [];
    e.eventSurface(PhysicsSensorEvent).subscribe(batch => events.push(...batch.map(x => x.payload.type)));
    step(e, 180);
    assert(body(e, 'ball').pose.position[0] > 2.8);
    assert(Math.abs(body(e, 'ball').velocity.linear[0] - 2) < 1e-5);
    assert(events.includes('sensor.enter'));
    assert(events.includes('sensor.exit'));
    const hit = r.query({ type: 'raycast', origin: [10, 10, 0], direction: [0, -1, 0], maxDistance: 30 });
    assert.equal(hit.colliderId, 'collider:floor');
    assert(Math.abs(hit.distance - 10) < .02);
    assert.throws(() => r.query({ type: 'shapecast' }), /Unsupported/);
    r.dispose();
});
test('hinge keeps anchors joined while allowing constrained motion', () => {
    const e = world();
    addBody(e, { id: 'anchor', type: 'static', position: [0, 4, 0], sensor: true });
    addBody(e, { id: 'pendulum', position: [0, 3, 0], velocity: [2, 0, 0], sleep: false });
    e.n.physicsConstraintRegistry.defineConstraint({ operationId: 'joint:hinge', constraint: { id: 'hinge', type: 'hinge', bodyA: 'anchor', bodyB: 'pendulum', frames: { bodyA: { position: [0, 0, 0] }, bodyB: { position: [0, 1, 0] } }, parameters: { axisA: [0, 0, 1], axisB: [0, 0, 1] } } });
    const { runtime: r } = attach(e, R);
    let maxError = 0, moved = false;
    for (let i = 0; i < 240; i++) {
        e.tick(1 / 60);
        const b = body(e, 'pendulum'), q = b.pose.rotation; // q rotates local anchor [0,1,0]
        const [x, y, z, w] = q, rot = [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
        maxError = Math.max(maxError, Math.hypot(b.pose.position[0] + rot[0], b.pose.position[1] + rot[1] - 4, b.pose.position[2] + rot[2]));
        moved ||= Math.abs(b.pose.position[0]) > .1;
    }
    assert(moved);
    assert(maxError < .05, `anchor error ${maxError}`);
    r.dispose();
});
test('1200 actual engine ticks reproduce exactly in independent runs; streaming receipts stay bounded', () => {
    const runs = [];
    for (let run = 0; run < 2; run++) {
        const e = world();
        addBody(e, { id: 'box', position: [0, 3, 0] });
        const { runtime: r } = attach(e, R);
        const hashes = [];
        for (let i = 0; i < 1200; i++) {
            e.tick(1 / 60);
            hashes.push(hash(e));
        }
        assert.equal(e.getLastTickCommit().frame, 1200);
        assert.equal(e.n.physicsStep.getState().nextStepId, 1200);
        assert.equal(e.n.physicsBodyRegistry.getState().lastStep.stepId, 1199);
        assert.equal(Object.keys(e.n.physicsBodyRegistry.getState().operationReceipts).length, 2);
        assert.equal(Object.keys(e.n.physicsStep.getState().operationReceipts ?? {}).length, 0);
        assert.equal(e.n.simulation.getResolutionLedger().committedStepIds.length, 256);
        runs.push(hashes);
        r.dispose();
    }
    assert.deepEqual(runs[0], runs[1]);
});
test('snapshot roundtrip preserves future native trajectory; repeated reset reproduces initial ticks', () => {
    const e = world();
    addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r } = attach(e, R);
    step(e, 35);
    const saved = JSON.parse(JSON.stringify(r.getSnapshot()));
    step(e, 100);
    const expected = hash(e);
    r.loadSnapshot(saved);
    step(e, 100);
    assert.equal(hash(e), expected);
    r.reset();
    step(e, 35);
    const first = hash(e);
    r.reset();
    r.reset();
    step(e, 35);
    assert.equal(hash(e), first);
    r.dispose();
});
test('late Simulation participant failure rolls back native world, Core state, clock and events; retry matches control', () => {
    const e = world();
    addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r } = attach(e, R);
    step(e, 20);
    const saved = r.getSnapshot(), before = hash(e);
    const p = { id: 'zz.failure', prepare() { return null; }, apply() { throw new Error('injected-late-failure'); }, rollback() { } };
    e.n.simulation.registerCommitParticipant(p);
    assert.throws(() => e.tick(1 / 60), /injected-late-failure/);
    assert.equal(hash(e), before);
    assert.deepEqual(r.getSnapshot().provider, saved.provider);
    e.n.simulation.unregisterCommitParticipant(p.id);
    e.tick(1 / 60);
    const actual = hash(e);
    r.loadSnapshot(saved);
    e.tick(1 / 60);
    assert.equal(hash(e), actual);
    r.dispose();
});
test('fault after Physics commit in cleanup also restores enrolled state and clock', () => {
    const e = world();
    addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r } = attach(e, R);
    step(e, 10);
    const before = hash(e), saved = r.getSnapshot();
    let fail = true;
    e.scheduler.addSystem('cleanup', () => { if (fail)
        throw new Error('cleanup-failure'); });
    assert.throws(() => e.tick(1 / 60), /cleanup-failure/);
    assert.equal(hash(e), before);
    assert.deepEqual(r.getSnapshot().provider, saved.provider);
    fail = false;
    e.tick(1 / 60);
    r.dispose();
});
test('bad fixed delta, invalid snapshot, duplicate attachment and conflict fail without corrupting state', () => {
    const e = world();
    addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r, provider: p } = attach(e, R);
    assert.equal(createPhysicsRuntimeAdapter({ engine: e, provider: p, worldId: 'world' }), r);
    assert.throws(() => createPhysicsRuntimeAdapter({ engine: e, provider: p, worldId: 'other' }), /Conflicting/);
    step(e, 10);
    const before = hash(e), saved = r.getSnapshot();
    assert.throws(() => e.tick(1 / 30), /fixed step/);
    assert.equal(hash(e), before);
    const bad = structuredClone(saved);
    bad.provider.version = 'wrong';
    assert.throws(() => r.loadSnapshot(bad), /incompatible/i);
    assert.equal(hash(e), before);
    const bad2 = structuredClone(saved);
    bad2.core.physicsStep.nextStepId++;
    assert.throws(() => r.loadSnapshot(bad2), /disagree/);
    assert.equal(hash(e), before);
    assert.equal(r.dispose(), true);
    assert.equal(r.dispose(), false);
});

// Negative provider records must fail before replacement of the native world.
test('malformed native snapshot bindings fail without changing the provider or Core', () => {
    const e = world(); addBody(e, { id: 'box', position: [0, 3, 0] });
    const { runtime: r, provider: p } = attach(e, R); step(e, 5);
    const saved = r.getSnapshot(), before = hash(e);
    for (const field of ['motions', 'pairs', 'bodies']) {
        const bad = structuredClone(saved); bad.provider[field] = { invalid: true };
        assert.throws(() => r.loadSnapshot(bad), /snapshot|entries/i);
        assert.equal(hash(e), before); assert.deepEqual(p.getSnapshot(), saved.provider);
    }
    const bad = structuredClone(saved); bad.provider.bodies.push(bad.provider.bodies[0]);
    assert.throws(() => r.loadSnapshot(bad), /duplicate/i);
    assert.equal(hash(e), before); assert.deepEqual(p.getSnapshot(), saved.provider); r.dispose();
});
test('provider contract validates and unsupported friction rejects instead of approximating', () => {
    const e = world(); addBody(e, { id: 'box' });
    const { runtime: r, provider: p } = attach(e, R);
    assert.equal(e.n.physicsProviderContract.validateProvider(p).valid, true);
    const before = p.getSnapshot();
    const c = e.n.physicsColliderRegistry.getCollider('collider:box');
    const material = e.n.physicsMaterial.getMaterial(c.material.materialId);
    material.friction.staticCoefficient += 0.1;
    assert.throws(() => p.syncColliders([{collider:c,shape:e.n.shapeRegistry.getShape(c.attachment.shapeId),material}]), /equal isotropic/);
    assert.deepEqual(p.getSnapshot(), before); r.dispose();
});
