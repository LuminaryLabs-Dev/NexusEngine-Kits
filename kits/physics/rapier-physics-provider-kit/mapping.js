import { normalizeCollider } from 'nexusengine/domains/physics/collider';
import { normalizeShape } from 'nexusengine/domains/physics/shape';
import { normalizeConstraintDescriptor } from 'nexusengine/domains/physics/constraints';
export const vector = a => ({ x: a[0], y: a[1], z: a[2] });
export const rotation = a => ({ x: a[0], y: a[1], z: a[2], w: a[3] });
export const array3 = v => [v.x, v.y, v.z];
export const array4 = q => [q.x, q.y, q.z, q.w];
export const clone = value => structuredClone(value);
export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
export const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function finiteVector(value, label) {
    if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v)))
        throw new TypeError(`${label} requires three finite numbers.`);
    return [...value];
}
export function bodyRecord(input, normalizeBodyState) {
    if (!Number.isSafeInteger(input?.revision) || input.revision < 1)
        throw new TypeError('Body revision is required.');
    const body = normalizeBodyState(input.body);
    if (body.type.kind !== 'dynamic' && Object.values(body.force).some(v => Array.isArray(v) && v.some(x => x !== 0)))
        throw new TypeError('Forces and impulses require a dynamic body in this profile.');
    if (body.type.kind === 'static' && [...body.velocity.linear, ...body.velocity.angular].some(x => x !== 0))
        throw new TypeError('A static body cannot have velocity in this profile.');
    return { revision: input.revision, body };
}
export function colliderRecord(input) {
    const collider = normalizeCollider(input?.collider), shape = normalizeShape(input?.shape);
    if (collider.attachment.shapeId !== shape.id)
        throw new TypeError('Collider shape identity mismatch.');
    if (!['box', 'sphere', 'capsule', 'cylinder', 'cone'].includes(shape.type))
        throw new TypeError(`Unsupported Rapier profile shape: ${shape.type}.`);
    const m = input.material;
    if (!m || m.id !== collider.material.materialId)
        throw new TypeError('Collider material identity mismatch.');
    const f = m.friction, p = m.combinePolicy;
    if (!f || f.staticCoefficient !== f.dynamicCoefficient || f.rollingCoefficient !== 0 || f.spinningCoefficient !== 0 || f.anisotropy !== null) {
        throw new TypeError('Rapier profile requires equal isotropic static/dynamic friction and zero rolling/spinning friction.');
    }
    if (!Number.isFinite(f.dynamicCoefficient) || f.dynamicCoefficient < 0 || !Number.isFinite(m.restitution?.coefficient) || m.restitution.coefficient < 0 || m.restitution.coefficient > 1)
        throw new TypeError('Invalid material coefficients.');
    if (m.restitution.thresholdSpeed !== 1 || p.priority !== 0)
        throw new TypeError('Rapier profile supports restitution thresholdSpeed=1 and combine priority=0 only.');
    if (!['average', 'minimum', 'maximum', 'multiply'].includes(p.frictionMode) || !['average', 'minimum', 'maximum', 'multiply'].includes(p.restitutionMode))
        throw new TypeError('Unsupported combine policy.');
    if (collider.filter.layer > 15 || collider.filter.maskLayers.some(x => x > 15) || collider.filter.excludedColliderIds.length || collider.filter.groupId !== null)
        throw new TypeError('Rapier profile supports 16 collision layers and no per-collider exclusions.');
    if (collider.sensor.reportContacts)
        throw new TypeError('Sensor contact-point reports are not implemented in this profile.');
    return { collider, shape, material: clone(m) };
}
export function constraintRecord(input) {
    const constraint = normalizeConstraintDescriptor(input?.constraint);
    if (!['enabled', 'disabled', 'broken'].includes(input.status))
        throw new TypeError('Invalid constraint status.');
    if (!['fixed', 'hinge', 'ball-socket', 'distance'].includes(constraint.type))
        throw new TypeError(`Unsupported Rapier profile constraint: ${constraint.type}.`);
    if (constraint.breakPolicy.enabled)
        throw new TypeError('Automatic break-force policy is not supported by this profile.');
    if (constraint.type === 'hinge' && (!same(constraint.parameters.axisA, constraint.parameters.axisB) || !same(constraint.frames.bodyA.rotation, [0, 0, 0, 1]) || !same(constraint.frames.bodyB.rotation, [0, 0, 0, 1])))
        throw new TypeError('Hinge profile requires matching local axes and identity local frame rotations.');
    if (constraint.type === 'distance' && constraint.parameters.minimumDistance !== 0)
        throw new TypeError('Distance profile currently implements a rope with minimumDistance=0.');
    return { constraint, status: input.status };
}
export function makeBody(R, b) {
    const d = b.type.kind === 'static' ? R.RigidBodyDesc.fixed() : b.type.kind === 'kinematic' ? R.RigidBodyDesc.kinematicVelocityBased() : R.RigidBodyDesc.dynamic();
    d.setTranslation(...b.pose.position).setRotation(rotation(b.pose.rotation));
    d.setLinvel(...b.velocity.linear).setAngvel(vector(b.velocity.angular));
    d.setGravityScale(0).setLinearDamping(b.damping.linear).setAngularDamping(b.damping.angular);
    d.setEnabled(b.lifecycle.status === 'active');
    if (b.type.kind === 'dynamic') {
        d.setAdditionalMassProperties(b.mass.kilograms, vector(b.mass.centerOfMass), vector(b.inertia.principal), rotation(b.inertia.orientation));
        // Core's explicit thresholds govern sleep; don't let backend defaults compete.
        d.setCanSleep(false).setSleeping(b.sleep.sleeping).setCcdEnabled(true);
    }
    return d;
}
export function updateBody(rb, b) {
    rb.setTranslation(vector(b.pose.position), false);
    rb.setRotation(rotation(b.pose.rotation), false);
    rb.setLinvel(vector(b.velocity.linear), false);
    rb.setAngvel(vector(b.velocity.angular), false);
    rb.setLinearDamping(b.damping.linear);
    rb.setAngularDamping(b.damping.angular);
    rb.setEnabled(b.lifecycle.status === 'active');
    if (b.type.kind === 'dynamic') {
        rb.setAdditionalMassProperties(b.mass.kilograms, vector(b.mass.centerOfMass), vector(b.inertia.principal), rotation(b.inertia.orientation), false);
        if (b.sleep.sleeping)
            rb.sleep();
        else
            rb.wakeUp();
    }
}
export function makeCollider(R, { collider: c, shape: s, material: m }) {
    const d = s.type === 'sphere' ? R.ColliderDesc.ball(s.radius) : s.type === 'box' ? R.ColliderDesc.cuboid(...s.halfExtents) : R.ColliderDesc[s.type](s.halfHeight, s.radius);
    const modes = { average: R.CoefficientCombineRule.Average, minimum: R.CoefficientCombineRule.Min, maximum: R.CoefficientCombineRule.Max, multiply: R.CoefficientCombineRule.Multiply };
    d.setTranslation(...c.pose.position).setRotation(rotation(c.pose.rotation)).setDensity(0);
    d.setSensor(c.sensor.enabled).setEnabled(c.lifecycle.status === 'enabled');
    d.setFriction(m.friction.dynamicCoefficient).setRestitution(m.restitution.coefficient);
    d.setFrictionCombineRule(modes[m.combinePolicy.frictionMode]).setRestitutionCombineRule(modes[m.combinePolicy.restitutionMode]);
    const membership = 1 << c.filter.layer, mask = c.filter.maskLayers.reduce((bits, n) => bits | (1 << n), 0);
    d.setCollisionGroups(((membership << 16) | mask) >>> 0);
    return d;
}
export function makeJoint(R, c) {
    const a = vector(c.frames.bodyA.position), b = vector(c.frames.bodyB.position);
    if (c.type === 'hinge')
        return R.JointData.revolute(a, b, vector(c.parameters.axisA));
    if (c.type === 'fixed')
        return R.JointData.fixed(a, rotation(c.frames.bodyA.rotation), b, rotation(c.frames.bodyB.rotation));
    if (c.type === 'distance')
        return R.JointData.rope(c.parameters.maximumDistance, a, b);
    return R.JointData.spherical(a, b);
}
