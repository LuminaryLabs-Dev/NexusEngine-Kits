import { createEngine } from 'nexusengine';
import { createPhysicsContractsDomain } from 'nexusengine/domains/physics/contracts';
import { createPhysicsLifecycleDomain } from 'nexusengine/domains/physics/lifecycle';
import { createPhysicsBodyDomain } from 'nexusengine/domains/physics/body';
import { createPhysicsShapeDomain } from 'nexusengine/domains/physics/shape';
import { createPhysicsMaterialDomain } from 'nexusengine/domains/physics/material';
import { createPhysicsWorldDomain } from 'nexusengine/domains/physics/world';
import { createPhysicsColliderDomain } from 'nexusengine/domains/physics/collider';
import { createPhysicsConstraintsDomain } from 'nexusengine/domains/physics/constraints';
import { createSpatialKit } from 'nexusengine/domains/spatial';
import { createSimulationKit } from 'nexusengine/domains/simulation';
import { createRapierPhysicsProvider } from '@luminarylabs/nexusengine-kits/rapier-physics-provider-kit';
import { createPhysicsRuntimeAdapter } from '@luminarylabs/nexusengine-kits/physics-runtime-adapter-kit';
export function makeEngine() {
    return createEngine({ kits: [...createPhysicsContractsDomain(), ...createPhysicsLifecycleDomain(), ...createPhysicsBodyDomain(),
            ...createPhysicsShapeDomain(), ...createPhysicsMaterialDomain(), ...createPhysicsWorldDomain(), ...createPhysicsColliderDomain(), ...createPhysicsConstraintsDomain(), createSpatialKit(), createSimulationKit({ resolution: true })] });
}
export function buildScene(engine, { gravity = [0, -9.81, 0] } = {}) {
    const n = engine.n;
    n.physicsGravityField.defineField({ operationId: 'define:gravity', field: { id: 'gravity', kind: 'uniform', vector: gravity } });
    n.physicsWorld.defineWorld({ operationId: 'define:world', world: { id: 'world', gravityFieldIds: ['gravity'] } });
    for (const [id, friction, bounce] of [['normal', 0.6, 0], ['slippery', 0, 0], ['bounce', 0, 0.8]])
        n.physicsMaterial.defineMaterial({ operationId: 'material:' + id, material: { id, friction: { staticCoefficient: friction, dynamicCoefficient: friction }, restitution: { coefficient: bounce } } });
}
export function addBody(engine, { id, type = 'dynamic', position = [0, 0, 0], velocity = [0, 0, 0], shape = { type: 'box', halfExtents: [0.5, 0.5, 0.5] }, material = 'normal', sensor = false, sleep = true } = {}) {
    const n = engine.n;
    n.physicsBodyRegistry.defineBody({ operationId: 'body:' + id, body: { identity: { id }, type: { kind: type }, pose: { position }, velocity: { linear: velocity }, sleep: { allowSleep: type === 'dynamic' ? sleep : false } } });
    n.shapeRegistry.defineShape({ operationId: 'shape:' + id, shape: { id: 'shape:' + id, ...shape } });
    n.physicsColliderRegistry.defineCollider({ operationId: 'collider:' + id, collider: { identity: { id: 'collider:' + id }, attachment: { bodyId: id, shapeId: 'shape:' + id }, material: { materialId: material }, sensor: { enabled: sensor }, trigger: { enabled: sensor }, filter: { layer: 0, maskLayers: [0] } } });
}
export function attach(engine, R) {
    const p = createRapierPhysicsProvider({ RAPIER: R, normalizeBodyState: engine.n.physicsBodyState.normalize });
    const n = engine.n;
    p.initialize();
    n.physicsInstallation.install({ operationId: 'physics:install', providerId: p.id });
    n.physicsStartup.begin({ operationId: 'physics:start' });
    n.physicsStartup.complete({ operationId: 'physics:ready', providerReceipt: { providerId: p.id, ready: true } });
    return { provider: p, runtime: createPhysicsRuntimeAdapter({ engine, provider: p, worldId: 'world' }) };
}
