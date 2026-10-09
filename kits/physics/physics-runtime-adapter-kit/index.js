import { defineEvent } from 'nexusengine';
export const PhysicsContactEvent = defineEvent('physics.runtime.contact');
export const PhysicsSensorEvent = defineEvent('physics.runtime.sensor');
const installed = new WeakMap();
const clone = value => structuredClone(value);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const owners = ['physicsGravityField', 'physicsForceField', 'physicsWindField', 'physicsTimeScale', 'physicsSimulationRegion',
    'physicsWorld', 'physicsMaterial', 'shapeRegistry', 'physicsBodyRegistry', 'physicsColliderRegistry', 'physicsConstraintRegistry',
    'physicsInstallation', 'physicsStartup', 'physicsShutdown', 'physicsStep', 'spatial', 'simulation'];
/** An explicitly attached host adapter. Core registries remain the semantic owners. */
export function createPhysicsRuntimeAdapter({ engine, provider, worldId, fixedDelta = 1 / 60 } = {}) {
    if (!engine?.n || !provider || typeof worldId !== 'string' || !worldId || !Number.isFinite(fixedDelta) || fixedDelta <= 0 || fixedDelta > 1 / 15)
        throw new TypeError('Expected an engine, provider, worldId and bounded fixedDelta.');
    const previous = installed.get(engine);
    if (previous) {
        if (previous.provider !== provider || previous.worldId !== worldId || previous.fixedDelta !== fixedDelta)
            throw new TypeError('Conflicting Physics runtime attachment.');
        return previous.api;
    }
    if (typeof engine.getTickSnapshot !== 'function' || typeof engine.loadTickSnapshot !== 'function' || typeof engine.registerTickCheckpoint !== 'function')
        throw new TypeError('This adapter requires the bounded Physics runtime Core update.');
    for (const name of owners)
        if (typeof engine.n[name]?.getSnapshot !== 'function' || typeof engine.n[name]?.loadSnapshot !== 'function')
            throw new TypeError(`Install required Core capability ${name} explicitly.`);
    const n = engine.n;
    if (typeof n.simulation.registerCommitParticipant !== 'function' || typeof n.physicsBodyRegistry.commitStep !== 'function' || typeof n.physicsStep.commitFrame !== 'function')
        throw new TypeError('Install the Core Simulation resolution and streaming commit capabilities.');
    for (const method of ['initialize', 'syncBodies', 'syncColliders', 'syncConstraints', 'submitMotionRequests', 'step', 'getSnapshot', 'loadSnapshot', 'getFrame', 'query', 'dispose'])
        if (typeof provider[method] !== 'function')
            throw new TypeError(`Provider requires ${method}.`);
    const selected = n.physicsInstallation.getInstallation()?.providerId;
    if (selected !== provider.id || n.physicsInstallation.getPhase() !== 'ready' || n.physicsStartup.getStatus() !== 'ready')
        throw new TypeError('Explicitly complete Physics installation/startup for the selected provider before attaching.');
    let disposed = false;
    const assertIdle = () => { if (disposed)
        throw new Error('Physics runtime is disposed.'); if (engine.isTicking())
        throw new Error('Operation requires an idle engine.'); };
    function scene() {
        const w = n.physicsWorld.getWorld(worldId);
        if (!w || !w.enabled)
            throw new TypeError('An enabled Physics world is required.');
        if (w.windFieldIds.length || w.timeScaleIds.length || w.simulationRegionIds.length || w.settings.lengthUnitMeters !== 1 || w.settings.coordinateSystem !== 'right-handed' || w.settings.bounds !== null)
            throw new TypeError('First runtime profile requires metre/right-handed coordinates without wind, time scales or regions.');
        const bodies = n.physicsBodyRegistry.listRecords();
        const colliders = n.physicsColliderRegistry.listColliders().map(c => ({ collider: c, shape: n.shapeRegistry.getShape(c.attachment.shapeId), material: n.physicsMaterial.getMaterial(c.material.materialId) }));
        const constraints = n.physicsConstraintRegistry.listRecords();
        const ids = new Set(bodies.map(r => r.body.identity.id));
        for (const c of colliders)
            if (!ids.has(c.collider.attachment.bodyId))
                throw new TypeError('Collider refers to a removed body.');
        for (const c of constraints)
            if (!ids.has(c.constraint.bodyA) || !ids.has(c.constraint.bodyB))
                throw new TypeError('Constraint refers to a removed body.');
        return { bodies, colliders, constraints };
    }
    function sync(value) { provider.syncBodies(value.bodies); provider.syncColliders(value.colliders); provider.syncConstraints(value.constraints); }
    scene(); // Reference and world-policy failures happen before provider execution or hook registration.
    provider.initialize();
    const providerBefore = provider.getSnapshot();
    try {
        sync(scene());
    }
    catch (error) {
        provider.loadSnapshot(providerBefore);
        throw error;
    }
    function capture() {
        assertIdle();
        return { schema: 'nexusengine.physics-host-snapshot/1', profile: { worldId, fixedDelta, providerId: provider.id, providerVersion: provider.version },
            clock: engine.getTickSnapshot(), core: Object.fromEntries(owners.map(name => [name, n[name].getSnapshot()])), provider: provider.getSnapshot() };
    }
    function restoreRaw(snapshot) {
        provider.loadSnapshot(snapshot.provider);
        for (const name of owners)
            n[name].loadSnapshot(snapshot.core[name]);
        engine.loadTickSnapshot(snapshot.clock);
    }
    function load(snapshot) {
        assertIdle();
        const value = clone(snapshot), before = capture();
        if (value?.schema !== 'nexusengine.physics-host-snapshot/1' || !same(value.profile, before.profile) || !value.core || owners.some(k => !value.core[k]))
            throw new TypeError('Incompatible or incomplete Physics host snapshot.');
        try {
            engine.world.atomic(() => {
                restoreRaw(value);
                const state = scene(), last = n.physicsBodyRegistry.getState().lastStep;
                if (value.provider.nextStepId !== n.physicsStep.getState().nextStepId || value.provider.nextStepId !== (last ? last.stepId + 1 : 0))
                    throw new TypeError('Physics snapshot step owners disagree.');
                // The provider cache may still hold its pre-commit revision; semantic bodies must agree.
                const nativeBodies = new Map(value.provider.bodies);
                for (const { body } of state.bodies)
                    if (!same(nativeBodies.get(body.identity.id)?.body, body))
                        throw new TypeError('Physics snapshot body owners disagree.');
                if (nativeBodies.size !== state.bodies.length)
                    throw new TypeError('Physics snapshot body count differs.');
            });
        }
        catch (error) {
            // ECS resources/journal were already restored by world.atomic. Restore only
            // enlisted external state here; reloading Core again would leak load events.
            provider.loadSnapshot(before.provider);
            for (const k of ['resources', 'pressure', 'windows'])
                n.simulation[k].loadSnapshot(before.core.simulation.services[k]);
            engine.loadTickSnapshot(before.clock);
            throw error;
        }
        return true;
    }
    const participant = { id: 'physics.runtime',
        prepare() {
            if (disposed)
                throw new Error('Physics runtime is disposed.');
            const tick = engine.getCurrentTickContext();
            if (!tick || Math.abs(tick.delta - fixedDelta) > 1e-12)
                throw new TypeError('Physics runtime requires exactly one configured fixed step per engine tick.');
            const value = scene(), stepId = n.physicsStep.getState().nextStepId;
            if (n.physicsStep.getPending())
                throw new TypeError('A separate Physics step request is pending.');
            const motions = value.bodies.map(({ body }) => {
                const sample = n.physicsWorld.sample(worldId, { position: body.pose.position, timeSeconds: tick.elapsed - fixedDelta, deltaSeconds: fixedDelta });
                return { bodyId: body.identity.id, acceleration: sample.acceleration, force: sample.force };
            });
            return { value, stepId, motions, before: provider.getSnapshot() };
        },
        apply(p) {
            sync(p.value);
            provider.submitMotionRequests(p.motions);
            const frame = provider.step({ stepId: p.stepId, deltaSeconds: fixedDelta });
            const records = new Map(p.value.bodies.map(r => [r.body.identity.id, r]));
            if (frame.stepId !== p.stepId || !Array.isArray(frame.bodies) || frame.bodies.length !== records.size)
                throw new TypeError('Incomplete provider frame.');
            n.physicsBodyRegistry.commitStep({ stepId: p.stepId, updates: frame.bodies.map(body => ({ bodyId: body.identity.id,
                    expectedRevision: records.get(body.identity.id)?.revision, pose: body.pose, velocity: body.velocity,
                    sleeping: body.sleep.sleeping, idleSeconds: body.sleep.idleSeconds, consumeImpulses: body.lifecycle.status === 'active' })) });
            const transforms = Object.fromEntries(n.physicsBodyRegistry.listBodies().map(body => [body.identity.id, { position: body.pose.position, rotation: body.pose.rotation, scale: [1, 1, 1] }]));
            // Only the named Physics transform namespace is replaced; unrelated Spatial state remains intact.
            n.spatial.update({ descriptors: { physicsTransform: transforms } });
            n.physicsStep.commitFrame({ operationId: `physics-stream:${p.stepId}`, stepId: p.stepId, providerId: provider.id, frame: { deltaSeconds: fixedDelta, contacts: frame.contacts, events: frame.events, bodyIds: [...records.keys()] } });
            for (const event of frame.events)
                engine.world.emit(event.sensor ? PhysicsSensorEvent : PhysicsContactEvent, event);
        },
        rollback(p) { provider.loadSnapshot(p.before); }
    };
    const checkpoint = { id: 'physics.runtime', capture() {
            return { provider: provider.getSnapshot(), services: Object.fromEntries(['resources', 'pressure', 'windows'].map(k => [k, n.simulation[k].getSnapshot()])) };
        }, restore(value) {
            provider.loadSnapshot(value.provider);
            for (const k of ['resources', 'pressure', 'windows'])
                n.simulation[k].loadSnapshot(value.services[k]);
        } };
    engine.registerTickCheckpoint(checkpoint);
    try {
        n.simulation.registerCommitParticipant(participant);
    }
    catch (error) {
        engine.unregisterTickCheckpoint(checkpoint.id);
        provider.loadSnapshot(providerBefore);
        throw error;
    }
    const api = Object.freeze({ id: 'physics-runtime-adapter', providerId: provider.id, worldId, fixedDelta,
        getSnapshot: capture, loadSnapshot: load,
        getFrame() { return n.physicsStep.getLastCompleted()?.frame ?? null; },
        query(request) { assertIdle(); return provider.query(request); },
        getTransforms() { return n.spatial.getDescriptors('physicsTransform'); },
        reset() { assertIdle(); return load(initial); },
        dispose() { if (disposed)
            return false; assertIdle(); disposed = true; n.simulation.unregisterCommitParticipant(participant.id); engine.unregisterTickCheckpoint(checkpoint.id); installed.delete(engine); provider.dispose(); return true; }
    });
    const initial = capture();
    installed.set(engine, { provider, worldId, fixedDelta, api });
    return api;
}
