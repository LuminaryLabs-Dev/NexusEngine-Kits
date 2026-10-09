import { array3, array4, bodyRecord as validateBodyRecord, clone, colliderRecord, constraintRecord, finiteVector, makeBody, makeCollider, makeJoint, same, updateBody, vector } from './mapping.js';
export const RAPIER_PROFILE = Object.freeze({ name: 'nexus-rigid-body/1', backendVersion: '0.19.0',
    shapes: Object.freeze(['box', 'sphere', 'capsule', 'cylinder', 'cone']), constraints: Object.freeze(['fixed', 'hinge', 'ball-socket', 'distance-rope']),
    queries: Object.freeze(['raycast']), collisionLayers: 16, determinism: 'same-wasm-build-and-runtime',
    customRestitutionThreshold: false, anisotropicFriction: false, workers: false, articulations: false });
/** Concrete WASM execution. The host supplies the already initialized, pinned module. */
export function createRapierPhysicsProvider({ RAPIER: R, normalizeBodyState } = {}) {
    if (!R || typeof R.version !== 'function' || R.version() !== RAPIER_PROFILE.backendVersion)
        throw new TypeError('Initialize and supply @dimforge/rapier3d-compat 0.19.0.');
    if (typeof normalizeBodyState !== 'function')
        throw new TypeError('Supply the installed Core physicsBodyState.normalize capability.');
    const bodyRecord = value => validateBodyRecord(value, normalizeBodyState);
    let world = null, disposed = false, bodies = new Map(), colliders = new Map(), joints = new Map(), motions = new Map(), pairs = new Map(), nextStepId = 0;
    let frame = { stepId: -1, bodies: [], contacts: [], events: [] };
    const ready = () => { if (!world || disposed)
        throw new Error('Rapier provider is not initialized or is disposed.'); };
    function normalizedList(input, normalizer, key) {
        if (!Array.isArray(input))
            throw new TypeError('Expected an array.');
        const list = input.map(normalizer).sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
        if (new Set(list.map(key)).size !== list.length)
            throw new TypeError('Duplicate provider record.');
        return list;
    }
    function capture() {
        ready();
        return { schema: 'nexusengine.rapier-snapshot/1', providerId: 'rapier-physics-provider', version: R.version(),
            bytes: Array.from(world.takeSnapshot()), bodies: clone([...bodies]), colliders: clone([...colliders]), joints: clone([...joints]),
            motions: clone([...motions]), pairs: clone([...pairs]), nextStepId, frame: clone(frame) };
    }
    function restore(s) {
        ready();
        if (s?.schema !== 'nexusengine.rapier-snapshot/1' || s.providerId !== 'rapier-physics-provider' || s.version !== R.version()
            || !Array.isArray(s.bytes) || s.bytes.length < 16 || s.bytes.length > 16 * 1024 * 1024 || s.bytes.some(x => !Number.isInteger(x) || x < 0 || x > 255)
            || !Number.isSafeInteger(s.nextStepId) || s.nextStepId < 0)
            throw new TypeError('Invalid or incompatible Rapier snapshot.');
        const value = clone(s);
        function snapshotMap(entries, label) {
            if (!Array.isArray(entries) || entries.length > 100000 || entries.some(e => !Array.isArray(e) || e.length !== 2 || typeof e[0] !== 'string' || !e[0]))
                throw new TypeError(`Invalid snapshot ${label} entries.`);
            const result = new Map(entries);
            if (result.size !== entries.length) throw new TypeError(`Duplicate snapshot ${label} identity.`);
            return result;
        }
        const nextBodies = snapshotMap(value.bodies, 'bodies'), nextColliders = snapshotMap(value.colliders, 'colliders'), nextJoints = snapshotMap(value.joints, 'joints');
        const nextMotions = snapshotMap(value.motions, 'motions'), nextPairs = snapshotMap(value.pairs, 'pairs');
        for (const [id, m] of nextMotions) {
            if (!nextBodies.has(id)) throw new TypeError('Unknown snapshot motion body.');
            finiteVector(m.acceleration, 'snapshot acceleration'); finiteVector(m.force, 'snapshot force');
        }
        for (const [id, pair] of nextPairs) {
            if (!pair || pair.id !== id || typeof pair.sensor !== 'boolean' || !Array.isArray(pair.points)
                || !nextColliders.has(pair.colliderA) || !nextColliders.has(pair.colliderB)) throw new TypeError('Invalid snapshot contact pair.');
            for (const point of pair.points) { finiteVector(point.point, 'snapshot contact point'); finiteVector(point.normal, 'snapshot contact normal'); }
        }
        for (const [name, records] of [['body', nextBodies], ['collider', nextColliders], ['joint', nextJoints]])
            if (new Set([...records.values()].map(x => x?.handle)).size !== records.size) throw new TypeError(`Duplicate snapshot ${name} handle.`);
        const candidate = R.World.restoreSnapshot(Uint8Array.from(value.bytes));
        if (!candidate)
            throw new TypeError('Rapier snapshot could not be restored.');
        try {
            if (value.frame?.stepId !== value.nextStepId - 1 || !Array.isArray(value.frame?.bodies) || !Array.isArray(value.frame?.contacts) || !Array.isArray(value.frame?.events))
                throw new TypeError('Snapshot frame sequence is inconsistent.');
            if (candidate.bodies.len() !== nextBodies.size || candidate.colliders.len() !== nextColliders.size || candidate.impulseJoints.len() !== nextJoints.size)
                throw new TypeError('Snapshot binding counts differ.');
            for (const [id, b] of nextBodies)
                if (!candidate.getRigidBody(b.handle) || bodyRecord(b).body.identity.id !== id)
                    throw new TypeError('Invalid body snapshot binding.');
            for (const [id, c] of nextColliders)
                if (!candidate.getCollider(c.handle) || colliderRecord(c).collider.identity.id !== id)
                    throw new TypeError('Invalid collider snapshot binding.');
            for (const [id, j] of nextJoints)
                if (!candidate.getImpulseJoint(j.handle) || constraintRecord(j).constraint.id !== id)
                    throw new TypeError('Invalid joint snapshot binding.');
        }
        catch (error) {
            candidate.free();
            throw error;
        }
        const previous = world;
        world = candidate;
        bodies = nextBodies;
        colliders = nextColliders;
        joints = nextJoints;
        motions = nextMotions;
        pairs = nextPairs;
        nextStepId = value.nextStepId;
        frame = value.frame;
        previous.free();
        return true;
    }
    function readContacts() {
        const byHandle = new Map([...colliders].map(([id, c]) => [c.handle, id])), current = new Map();
        for (const [aId, a] of colliders) {
            const ca = world.getCollider(a.handle);
            const visit = (cb, sensor) => {
                const bId = byHandle.get(cb.handle);
                if (!bId || aId >= bId)
                    return;
                const b = colliders.get(bId), points = [];
                if (!sensor)
                    world.contactPair(ca, cb, (manifold, flipped) => {
                        const n = array3(manifold.normal()).map(x => flipped ? -x : x);
                        for (let i = 0; i < manifold.numSolverContacts(); i++)
                            points.push({ point: array3(manifold.solverContactPoint(i)), normal: n });
                    });
                if (!sensor && !points.length)
                    return;
                const pair = { id: JSON.stringify([aId, bId]), colliderA: aId, colliderB: bId, bodyA: a.collider.attachment.bodyId, bodyB: b.collider.attachment.bodyId, sensor, points };
                current.set(pair.id, pair);
            };
            world.contactPairsWith(ca, cb => visit(cb, false));
            world.intersectionPairsWith(ca, cb => visit(cb, true));
        }
        const events = [];
        for (const [id, p] of [...current].sort(([a], [b]) => a < b ? -1 : 1))
            events.push({ ...p, type: `${p.sensor ? 'sensor' : 'contact'}.${pairs.has(id) ? 'stay' : 'enter'}` });
        for (const [id, p] of [...pairs].sort(([a], [b]) => a < b ? -1 : 1))
            if (!current.has(id))
                events.push({ ...p, type: `${p.sensor ? 'sensor' : 'contact'}.exit`, points: [] });
        pairs = current;
        return { contacts: clone([...current.values()]), events: events.filter(e => !e.sensor || [e.colliderA, e.colliderB].some(id => {
                const c = colliders.get(id)?.collider;
                return c?.sensor.enabled && c.trigger.enabled && c.trigger.events.includes(e.type.split('.')[1]);
            })) };
    }
    const api = {
        id: 'rapier-physics-provider', version: RAPIER_PROFILE.backendVersion, deterministic: true, capabilities: RAPIER_PROFILE,
        initialize() { if (disposed)
            throw new Error('Disposed provider.'); if (world)
            return { providerId: api.id, ready: true }; world = new R.World({ x: 0, y: 0, z: 0 }); return { providerId: api.id, ready: true }; },
        syncBodies(input) {
            ready();
            const values = normalizedList(input, bodyRecord, x => x.body.identity.id), ids = new Set(values.map(x => x.body.identity.id));
            for (const r of values) {
                const old = bodies.get(r.body.identity.id);
                if (old && old.body.type.kind !== r.body.type.kind)
                    throw new TypeError('Changing body type requires a fresh composition.');
            }
            for (const [id, b] of bodies)
                if (!ids.has(id)) {
                    world.removeRigidBody(world.getRigidBody(b.handle));
                    bodies.delete(id);
                }
            for (const r of values) {
                const id = r.body.identity.id, old = bodies.get(id);
                if (!old) {
                    const rb = world.createRigidBody(makeBody(R, r.body));
                    bodies.set(id, { ...r, handle: rb.handle });
                }
                else {
                    if (!same(old.body, r.body))
                        updateBody(world.getRigidBody(old.handle), r.body);
                    bodies.set(id, { ...r, handle: old.handle });
                }
            }
        },
        syncColliders(input) {
            ready();
            const values = normalizedList(input, colliderRecord, x => x.collider.identity.id), ids = new Set(values.map(x => x.collider.identity.id));
            for (const c of values)
                if (!bodies.has(c.collider.attachment.bodyId))
                    throw new TypeError('Unknown collider body.');
            for (const [id, c] of colliders)
                if (!ids.has(id) || !world.getCollider(c.handle)) {
                    if (world.getCollider(c.handle))
                        world.removeCollider(world.getCollider(c.handle), true);
                    colliders.delete(id);
                }
            for (const c of values) {
                const id = c.collider.identity.id, old = colliders.get(id);
                if (old && same(c, { collider: old.collider, shape: old.shape, material: old.material }))
                    continue;
                if (old)
                    world.removeCollider(world.getCollider(old.handle), true);
                const native = world.createCollider(makeCollider(R, c), world.getRigidBody(bodies.get(c.collider.attachment.bodyId).handle));
                colliders.set(id, { ...c, handle: native.handle });
            }
        },
        syncConstraints(input) {
            ready();
            const all = normalizedList(input, constraintRecord, x => x.constraint.id), values = all.filter(x => x.status === 'enabled'), ids = new Set(values.map(x => x.constraint.id));
            for (const { constraint: c } of values)
                if (!bodies.has(c.bodyA) || !bodies.has(c.bodyB))
                    throw new TypeError('Unknown joint body.');
            for (const [id, j] of joints)
                if (!ids.has(id) || !world.getImpulseJoint(j.handle)) {
                    if (world.getImpulseJoint(j.handle))
                        world.removeImpulseJoint(world.getImpulseJoint(j.handle), true);
                    joints.delete(id);
                }
            for (const j of values) {
                const c = j.constraint, old = joints.get(c.id);
                if (old && same(old.constraint, c))
                    continue;
                if (old)
                    world.removeImpulseJoint(world.getImpulseJoint(old.handle), true);
                const native = world.createImpulseJoint(makeJoint(R, c), world.getRigidBody(bodies.get(c.bodyA).handle), world.getRigidBody(bodies.get(c.bodyB).handle), true);
                native.setContactsEnabled(c.collideConnected);
                joints.set(c.id, { ...j, handle: native.handle });
            }
        },
        submitMotionRequests(input) {
            ready();
            if (!Array.isArray(input))
                throw new TypeError('Motion requests must be an array.');
            const next = new Map();
            for (const m of input) {
                if (!bodies.has(m.bodyId) || next.has(m.bodyId))
                    throw new TypeError('Unknown or duplicate motion body.');
                next.set(m.bodyId, { acceleration: finiteVector(m.acceleration, 'acceleration'), force: finiteVector(m.force, 'force') });
            }
            motions = next;
        },
        step({ stepId, deltaSeconds }) {
            ready();
            if (!Number.isSafeInteger(stepId) || stepId !== nextStepId || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 1 / 15)
                throw new TypeError('Invalid or out-of-order Physics step.');
            world.timestep = deltaSeconds;
            for (const [id, { body: b, handle }] of bodies) {
                if (b.type.kind !== 'dynamic' || b.lifecycle.status !== 'active')
                    continue;
                const rb = world.getRigidBody(handle), m = motions.get(id) ?? { acceleration: [0, 0, 0], force: [0, 0, 0] };
                rb.resetForces(false);
                rb.resetTorques(false);
                rb.addForce(vector(b.force.force.map((x, i) => x + m.force[i] + m.acceleration[i] * b.mass.kilograms)), false);
                rb.addTorque(vector(b.force.torque), false);
                if (b.force.linearImpulse.some(x => x !== 0))
                    rb.applyImpulse(vector(b.force.linearImpulse), true);
                if (b.force.angularImpulse.some(x => x !== 0))
                    rb.applyTorqueImpulse(vector(b.force.angularImpulse), true);
            }
            world.step();
            const outputs = [];
            for (const [id, record] of bodies) {
                const rb = world.getRigidBody(record.handle), b = record.body;
                let idle = b.sleep.idleSeconds;
                if (b.type.kind === 'dynamic' && b.sleep.allowSleep && b.lifecycle.status === 'active') {
                    const slow = Math.hypot(...array3(rb.linvel())) <= b.sleep.linearThreshold && Math.hypot(...array3(rb.angvel())) <= b.sleep.angularThreshold;
                    idle = slow ? idle + deltaSeconds : 0;
                    if (idle >= b.sleep.timeThreshold)
                        rb.sleep();
                }
                else
                    idle = 0;
                const next = normalizeBodyState({ ...b, pose: { position: array3(rb.translation()), rotation: array4(rb.rotation()) }, velocity: { linear: array3(rb.linvel()), angular: array3(rb.angvel()) },
                    sleep: { ...b.sleep, idleSeconds: idle, sleeping: b.type.kind === 'static' ? true : b.type.kind === 'kinematic' ? false : rb.isSleeping() }, force: b.type.kind === 'dynamic' && b.lifecycle.status === 'active' ? { ...b.force, linearImpulse: [0, 0, 0], angularImpulse: [0, 0, 0] } : b.force });
                bodies.set(id, { ...record, body: next });
                outputs.push(next);
            }
            const contacts = readContacts();
            frame = { stepId, deltaSeconds, bodies: outputs, ...contacts };
            nextStepId++;
            motions.clear();
            return clone(frame);
        },
        getFrame() { ready(); return clone(frame); }, getSnapshot: capture, loadSnapshot: restore,
        query(input) {
            ready();
            if (input?.type !== 'raycast')
                throw new TypeError('Unsupported query; use raycast.');
            const origin = finiteVector(input.origin, 'origin'), direction = finiteVector(input.direction, 'direction'), length = Math.hypot(...direction), distance = input.maxDistance;
            if (!length || !Number.isFinite(distance) || distance < 0 || typeof (input.includeSensors ?? false) !== 'boolean')
                throw new TypeError('Invalid raycast.');
            world.propagateModifiedBodyPositionsToColliders();
            const flags = input.includeSensors ? undefined : R.QueryFilterFlags.EXCLUDE_SENSORS;
            const hit = world.castRayAndGetNormal(new R.Ray(vector(origin), vector(direction.map(x => x / length))), distance, true, flags);
            if (!hit)
                return null;
            const entry = [...colliders].find(([, c]) => c.handle === hit.collider.handle);
            if (!entry)
                throw new Error('Unmapped query collider.');
            return { type: 'raycast', colliderId: entry[0], bodyId: entry[1].collider.attachment.bodyId, distance: hit.timeOfImpact, point: origin.map((x, i) => x + direction[i] / length * hit.timeOfImpact), normal: array3(hit.normal) };
        },
        reset() { ready(); world.free(); world = new R.World({ x: 0, y: 0, z: 0 }); bodies.clear(); colliders.clear(); joints.clear(); motions.clear(); pairs.clear(); nextStepId = 0; frame = { stepId: -1, bodies: [], contacts: [], events: [] }; return true; },
        dispose() { if (disposed)
            return false; disposed = true; world?.free(); world = null; bodies.clear(); colliders.clear(); joints.clear(); return true; }
    };
    return Object.freeze(api);
}
