import { normalizeRenderFrame } from 'nexusengine/domains/render/frame-schema';
/** Bounded primitive/debug view. Authored camera, light and appearance belong to the host. */
export function createThreePhysicsView({ THREE: T, engine, canvas, scene, camera, appearance = {}, backend = "webgl2", SVGRenderer } = {}) {
    if (!T || T.REVISION !== '180' || !engine?.n?.spatial || !canvas || !scene?.isScene || !camera?.isCamera)
        throw new TypeError('Supply Three.js r180, an engine, canvas, authored scene and camera.');
    if (!['webgl2', 'svg'].includes(backend) || (backend === 'svg' && typeof SVGRenderer !== 'function'))
        throw new TypeError('Select webgl2 or supply Three SVGRenderer explicitly.');
    const renderer = backend === 'svg' ? new SVGRenderer() : new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio?.(1);
    const meshes = new Map();
    let disposed = false, lastReceipt = null;
    const pose = new T.Matrix4(), bodyPose = new T.Matrix4(), localPose = new T.Matrix4();
    const vec = a => new T.Vector3(...a), quat = a => new T.Quaternion(...a);
    function geometry(s) {
        switch (s.type) {
            case 'box': return new T.BoxGeometry(...s.halfExtents.map(x => x * 2));
            case 'sphere': return new T.SphereGeometry(s.radius, 24, 16);
            case 'capsule': return new T.CapsuleGeometry(s.radius, s.halfHeight * 2, 6, 12);
            case 'cylinder': return new T.CylinderGeometry(s.radius, s.radius, s.halfHeight * 2, 24);
            case 'cone': return new T.ConeGeometry(s.radius, s.halfHeight * 2, 24);
            default: throw new TypeError(`Unsupported visual shape ${s.type}.`);
        }
    }
    function resize(width, height) {
        if (disposed)
            throw new Error('View disposed.');
        if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096)
            throw new TypeError('Viewport requires bounded integer dimensions.');
        renderer.setSize(width, height, false);
        if (camera.isPerspectiveCamera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }
    function render() {
        if (disposed)
            throw new Error('View disposed.');
        if (engine.isTicking())
            throw new Error('Render only after a completed engine tick.');
        const tick = engine.getLastTickCommit();
        if (!tick?.committed)
            throw new Error('A committed engine tick is required.');
        const transforms = engine.n.spatial.getDescriptors('physicsTransform');
        const values = engine.n.physicsColliderRegistry.listColliders().filter(c => c.lifecycle.status === 'enabled').map(c => ({ collider: c, shape: engine.n.shapeRegistry.getShape(c.attachment.shapeId), transform: transforms[c.attachment.bodyId] }));
        for (const v of values)
            if (!v.shape || !v.transform || !['box', 'sphere', 'capsule', 'cylinder', 'cone'].includes(v.shape.type))
                throw new TypeError('Missing or unsupported committed visual descriptor.');
        const ids = new Set(values.map(v => v.collider.identity.id));
        for (const [id, m] of meshes)
            if (!ids.has(id)) {
                scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                m.mesh.material.dispose();
                meshes.delete(id);
            }
        for (const { collider: c, shape: s, transform: t } of values) {
            const id = c.identity.id, signature = JSON.stringify(s), style = appearance[c.attachment.bodyId] ?? {};
            let m = meshes.get(id);
            if (!m || m.signature !== signature) {
                if (m) {
                    scene.remove(m.mesh);
                    m.mesh.geometry.dispose();
                    m.mesh.material.dispose();
                }
                const mesh = new T.Mesh(geometry(s), new T.MeshStandardMaterial({ color: style.color ?? 0x67c6bf, roughness: .65, metalness: 0, wireframe: c.sensor.enabled, transparent: c.sensor.enabled, opacity: c.sensor.enabled ? .65 : 1 }));
                mesh.name = id;
                scene.add(mesh);
                m = { mesh, signature };
                meshes.set(id, m);
            }
            bodyPose.compose(vec(t.position), quat(t.rotation), vec(t.scale));
            localPose.compose(vec(c.pose.position), quat(c.pose.rotation), new T.Vector3(1, 1, 1));
            pose.multiplyMatrices(bodyPose, localPose);
            pose.decompose(m.mesh.position, m.mesh.quaternion, m.mesh.scale);
        }
        const frame = normalizeRenderFrame({ schema: 'nexusengine.render-frame/1', frameId: `physics-view:${tick.tickId}`, sequence: tick.revision, surfaceId: 'physics-view', presentationTimeMs: tick.elapsed * 1000, deltaSeconds: tick.delta, viewIds: ['authored-camera'], passIds: ['three-primitive-pass'], resourceIds: [...ids], metadata: { providerId: 'three-physics-view', threeRevision: T.REVISION, tickId: tick.tickId } });
        renderer.render(scene, camera);
        if (backend === 'webgl2') {
            const gl = renderer.getContext(), error = gl.getError();
            if (error !== gl.NO_ERROR)
                throw new Error(`WebGL frame error ${error}.`);
        }
        lastReceipt = { frame, backend, drawCalls: backend === 'svg' ? renderer.domElement.querySelectorAll('path').length : renderer.info.render.calls, triangles: backend === 'svg' ? renderer.info.render.faces : renderer.info.render.triangles, rendered: true };
        return structuredClone(lastReceipt);
    }
    resize(canvas.width || 960, canvas.height || 600);
    return Object.freeze({ id: 'three-physics-view', element: renderer.domElement, render, resize, getReceipt: () => structuredClone(lastReceipt), getMeshPosition(id) { const m = meshes.get(id); return m ? m.mesh.position.toArray() : null; }, dispose() { if (disposed)
            return false; disposed = true; for (const { mesh } of meshes.values()) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        } meshes.clear(); renderer.dispose?.(); return true; } });
}
