function resolveRoot(root) {
  if (typeof document === "undefined") {
    return null;
  }

  if (!root) {
    return document.body;
  }

  return typeof root === "string" ? document.querySelector(root) : root;
}

function getSize(root) {
  const windowWidth = typeof innerWidth === "number" ? innerWidth : 960;
  const windowHeight = typeof innerHeight === "number" ? innerHeight : 640;
  const width = Math.max(320, root?.clientWidth || windowWidth);
  const height = Math.max(240, root?.clientHeight || windowHeight);
  return { width, height };
}

function worldToScreen(point, size) {
  return {
    x: size.width * 0.5 + Number(point?.x ?? 0) * 14,
    y: size.height * 0.52 + Number(point?.y ?? point?.z ?? 0) * 10
  };
}

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function degToRad(value) {
  return number(value) * Math.PI / 180;
}

function hexToRgb01(hex, fallback = [0.1, 0.5, 0.6]) {
  if (Array.isArray(hex)) return hex;
  if (typeof hex !== "string") return fallback;
  const clean = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return fallback;
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ];
}

function zoneColor01(kind) {
  if (kind === "reeds") return [0.28, 0.52, 0.36];
  if (kind === "kelp") return [0.25, 0.49, 0.36];
  if (kind === "coral") return [0.95, 0.44, 0.4];
  if (kind === "shelf") return [0.24, 0.45, 0.56];
  if (kind === "reef") return [0.52, 0.65, 0.46];
  return [0.06, 0.12, 0.21];
}

function zoneStyle(kind) {
  if (kind === "reeds") return "rgba(71, 134, 92, 0.28)";
  if (kind === "kelp") return "rgba(63, 124, 91, 0.26)";
  if (kind === "coral") return "rgba(242, 111, 101, 0.24)";
  if (kind === "shelf") return "rgba(61, 116, 144, 0.24)";
  if (kind === "reef") return "rgba(134, 166, 118, 0.26)";
  return "rgba(16, 31, 54, 0.26)";
}

function defaultRealismSnapshot() {
  return {
    quality: {
      id: "high",
      pixelRatio: 1.75,
      shadows: true,
      shadowMapSize: 2048,
      scatterDensity: 0.85,
      water: "realistic",
      cloudDensity: 0.9,
      post: "standard"
    },
    renderer: {
      toneMapping: "aces",
      exposure: 1.05,
      outputColorSpace: "srgb",
      shadows: { enabled: true, mapSize: 2048, distance: 120 }
    },
    lighting: {
      sun: { elevation: 28, azimuth: -42, intensity: 3.2, color: "#fff1c4" },
      sunDirection: { x: -0.58, y: 0.47, z: 0.66 },
      hemisphere: { sky: "#bfe7ff", ground: "#b88f62", intensity: 1.05 },
      exposure: 1.05,
      toneMapping: "aces",
      shadows: { enabled: true, mapSize: 2048, distance: 120 },
      environment: { type: "procedural-sky", intensity: 0.95 }
    },
    atmosphere: {
      haze: 0.015,
      horizon: "#f5d8ab",
      zenith: "#74b7dc",
      fogColor: "#b7d8e2",
      cloudDensityScale: 0.88,
      cloudLayers: [
        { type: "cumulus", density: 0.42, altitude: 28, speed: 0.028, scale: 1 },
        { type: "wisps", density: 0.18, altitude: 42, speed: 0.07, scale: 1.8 }
      ]
    },
    water: {
      transparent: true,
      clarity: 0.86,
      turbidity: 0.12,
      fresnel: 0.68,
      rippleScale: 0.28,
      caustics: true,
      depthTint: "#1c6c7d",
      shallowTint: "#76d9cb",
      opacity: 0.52,
      foam: { enabled: true, shoreline: true, contact: true }
    },
    scatter: {
      seed: "cozy-beach-realistic",
      effectiveDensity: 0.72,
      maxPerChunk: 46
    },
    terrainMaterials: {
      sand: { albedo: "#d6bd82", roughness: 0.92, ao: 0.86 },
      wetSand: { albedo: "#8f7b55", roughness: 0.58, ao: 0.9 },
      rock: { albedo: "#77786f", roughness: 0.8, ao: 0.72 },
      seabed: { albedo: "#4b958b", roughness: 0.84, ao: 0.82 },
      coral: { albedo: "#e79b92", roughness: 0.78, ao: 0.8 },
      kelp: { albedo: "#5d8f75", roughness: 0.88, ao: 0.84 }
    },
    wildlife: {
      fish: { depthFade: true, tailMotion: true },
      lure: { contactRings: true },
      line: { sag: true }
    },
    camera: { handheld: 0.035, focusSmoothing: 0.18, fightPulse: 0.06 },
    post: { vignette: 0.08, bloom: 0.06 }
  };
}

function resolveRealism(snapshot = {}, fallback = null) {
  return snapshot.realism ?? fallback ?? defaultRealismSnapshot();
}

function deterministic01(seed) {
  const input = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function vec3Normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function vec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mat4Identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const rangeInv = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (near + far) * rangeInv;
  out[11] = -1;
  out[14] = near * far * rangeInv * 2;
  return out;
}

function mat4LookAt(eye, target, up = [0, 1, 0]) {
  const zAxis = vec3Normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const xAxis = vec3Normalize(vec3Cross(up, zAxis));
  const yAxis = vec3Cross(zAxis, xAxis);
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -vec3Dot(xAxis, eye), -vec3Dot(yAxis, eye), -vec3Dot(zAxis, eye), 1
  ]);
}

function mat4FromTranslationRotationScale(position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const sx = scale[0];
  const sy = scale[1];
  const sz = scale[2];
  const cx = Math.cos(rotation[0]);
  const sxn = Math.sin(rotation[0]);
  const cy = Math.cos(rotation[1]);
  const syn = Math.sin(rotation[1]);
  const cz = Math.cos(rotation[2]);
  const szn = Math.sin(rotation[2]);
  const r00 = cy * cz;
  const r01 = sxn * syn * cz + cx * szn;
  const r02 = -cx * syn * cz + sxn * szn;
  const r10 = -cy * szn;
  const r11 = -sxn * syn * szn + cx * cz;
  const r12 = cx * syn * szn + sxn * cz;
  const r20 = syn;
  const r21 = -sxn * cy;
  const r22 = cx * cy;
  return new Float32Array([
    r00 * sx, r01 * sx, r02 * sx, 0,
    r10 * sy, r11 * sy, r12 * sy, 0,
    r20 * sz, r21 * sz, r22 * sz, 0,
    position[0], position[1], position[2], 1
  ]);
}

function appendVertex(out, position, normal, color, uv = [0, 0]) {
  out.positions.push(position[0], position[1], position[2]);
  out.normals.push(normal[0], normal[1], normal[2]);
  out.colors.push(color[0], color[1], color[2]);
  out.uvs.push(uv[0], uv[1]);
}

function computeFallbackHeight(terrain, x, z) {
  const shorelineZ = number(terrain.shorelineZ, -2);
  const beachSlope = Math.max(0, shorelineZ - z) * 0.11;
  const waterDepth = Math.max(0, z - shorelineZ) * -0.09;
  const ripple = Math.sin(x * 0.34) * 0.09 + Math.cos(z * 0.23) * 0.06;
  return beachSlope + waterDepth + ripple - 0.38;
}

function createTerrainMeshData(terrain = {}) {
  const width = number(terrain.width, 46);
  const depth = number(terrain.depth, 58);
  const resolution = Math.max(8, Math.floor(number(terrain.resolution, 36)));
  const shorelineZ = number(terrain.shorelineZ, -2);
  const beach = hexToRgb01(terrain.beachColor, [0.82, 0.66, 0.38]);
  const wet = hexToRgb01(terrain.wetSandColor, [0.54, 0.43, 0.28]);
  const floor = hexToRgb01(terrain.seaFloorColor, [0.22, 0.55, 0.5]);
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };

  for (let zIndex = 0; zIndex <= resolution; zIndex += 1) {
    const z = -depth * 0.5 + (zIndex / resolution) * depth;
    for (let xIndex = 0; xIndex <= resolution; xIndex += 1) {
      const x = -width * 0.5 + (xIndex / resolution) * width;
      const y = computeFallbackHeight(terrain, x, z);
      const left = computeFallbackHeight(terrain, x - 0.6, z);
      const right = computeFallbackHeight(terrain, x + 0.6, z);
      const down = computeFallbackHeight(terrain, x, z - 0.6);
      const up = computeFallbackHeight(terrain, x, z + 0.6);
      const normal = vec3Normalize([left - right, 1.2, down - up]);
      const waterMix = clamp((z - shorelineZ) / (depth * 0.42), 0, 1);
      const wetMix = clamp(1 - Math.abs(z - shorelineZ) / 8, 0, 1);
      const color = waterMix > 0
        ? floor.map((channel, i) => channel * waterMix + wet[i] * (1 - waterMix))
        : beach.map((channel, i) => channel * (1 - wetMix * 0.45) + wet[i] * wetMix * 0.45);
      appendVertex(mesh, [x, y, z], normal, color, [xIndex / resolution, zIndex / resolution]);
    }
  }

  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
      const a = zIndex * (resolution + 1) + xIndex;
      const b = a + 1;
      const c = a + resolution + 1;
      const d = c + 1;
      mesh.indices.push(a, c, b, b, c, d);
    }
  }
  return mesh;
}

function createTerrainChunkMeshData(chunk = {}) {
  const resolution = Math.max(2, Math.floor(number(chunk.resolution ?? chunk.lod?.resolution, 8)));
  const size = resolution + 1;
  const bounds = chunk.bounds ?? { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  const width = number(bounds.maxX) - number(bounds.minX);
  const depth = number(bounds.maxZ) - number(bounds.minZ);
  const heights = chunk.heightField ?? new Float32Array(size * size);
  const normals = chunk.normalField ?? null;
  const materialField = chunk.materialField ?? new Uint8Array(size * size);
  const wetnessField = chunk.wetnessField ?? new Float32Array(size * size);
  const aoField = chunk.aoField ?? new Float32Array(size * size).fill(0.9);
  const detailField = chunk.detailMaskField ?? new Float32Array(size * size);
  const shorelineField = chunk.shorelineMaskField ?? new Float32Array(size * size);
  const palette = chunk.materialPalette ?? [];
  const colorsByMaterial = chunk.materialColors ?? {};
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };

  for (let zIndex = 0; zIndex < size; zIndex += 1) {
    for (let xIndex = 0; xIndex < size; xIndex += 1) {
      const i = zIndex * size + xIndex;
      const x = number(bounds.minX) + (xIndex / resolution) * width;
      const z = number(bounds.minZ) + (zIndex / resolution) * depth;
      const material = palette[materialField[i]] ?? "sand";
      const rgb = hexToRgb01(colorsByMaterial[material], [0.72, 0.62, 0.42]);
      const wet = number(wetnessField[i], 0);
      const ao = number(aoField[i], 0.9);
      const detail = number(detailField[i], 0);
      const shore = number(shorelineField[i], 0);
      const micro = 0.92 + detail * 0.1 + Math.sin((x * 1.31 + z * 0.73) * 3.1) * 0.025;
      const wetDarken = material === "wet-sand" ? 1 - wet * 0.24 : 1 - wet * 0.08;
      const shoreWarmth = shore * 0.04;
      const color = [
        clamp((rgb[0] + shoreWarmth) * ao * micro * wetDarken, 0, 1),
        clamp((rgb[1] + shoreWarmth * 0.8) * ao * micro * wetDarken, 0, 1),
        clamp(rgb[2] * ao * micro * (wetDarken + shore * 0.04), 0, 1)
      ];
      const normal = normals
        ? [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]]
        : [0, 1, 0];
      appendVertex(mesh, [x, number(heights[i]), z], normal, color, [xIndex / resolution, zIndex / resolution]);
    }
  }

  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
      const a = zIndex * size + xIndex;
      const b = a + 1;
      const c = a + size;
      const d = c + 1;
      mesh.indices.push(a, c, b, b, c, d);
    }
  }
  return mesh;
}

function createPlaneMeshData(width = 1, depth = 1, segments = 1, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
    for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
      const x = -width * 0.5 + (xIndex / segments) * width;
      const z = -depth * 0.5 + (zIndex / segments) * depth;
      appendVertex(mesh, [x, 0, z], [0, 1, 0], color, [xIndex / segments, zIndex / segments]);
    }
  }
  for (let zIndex = 0; zIndex < segments; zIndex += 1) {
    for (let xIndex = 0; xIndex < segments; xIndex += 1) {
      const a = zIndex * (segments + 1) + xIndex;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      mesh.indices.push(a, c, b, b, c, d);
    }
  }
  return mesh;
}

function createDiskMeshData(segments = 48, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  appendVertex(mesh, [0, 0, 0], [0, 1, 0], color, [0.5, 0.5]);
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    appendVertex(mesh, [x, 0, z], [0, 1, 0], color, [x * 0.5 + 0.5, z * 0.5 + 0.5]);
  }
  for (let i = 1; i <= segments; i += 1) {
    mesh.indices.push(0, i, i + 1);
  }
  return mesh;
}

function createRingMeshData(segments = 64, inner = 0.72, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    appendVertex(mesh, [x * inner, 0, z * inner], [0, 1, 0], color, [0, i / segments]);
    appendVertex(mesh, [x, 0, z], [0, 1, 0], color, [1, i / segments]);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    mesh.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return mesh;
}

function createSphereMeshData(widthSegments = 18, heightSegments = 10, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const v = yIndex / heightSegments;
    const phi = v * Math.PI;
    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const u = xIndex / widthSegments;
      const theta = u * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      appendVertex(mesh, [x, y, z], [x, y, z], color, [u, v]);
    }
  }
  for (let yIndex = 0; yIndex < heightSegments; yIndex += 1) {
    for (let xIndex = 0; xIndex < widthSegments; xIndex += 1) {
      const a = yIndex * (widthSegments + 1) + xIndex;
      const b = a + 1;
      const c = a + widthSegments + 1;
      const d = c + 1;
      mesh.indices.push(a, c, b, b, c, d);
    }
  }
  return mesh;
}

function createConeMeshData(segments = 8, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  appendVertex(mesh, [0, 1, 0], [0, 1, 0], color, [0.5, 1]);
  appendVertex(mesh, [0, 0, 0], [0, -1, 0], color, [0.5, 0.5]);
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    const normal = vec3Normalize([x, 0.45, z]);
    appendVertex(mesh, [x, 0, z], normal, color, [i / segments, 0]);
  }
  for (let i = 2; i < 2 + segments; i += 1) {
    mesh.indices.push(0, i, i + 1, 1, i + 1, i);
  }
  return mesh;
}

function createLineMeshData(points, width = 0.035, color = [1, 1, 1]) {
  const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = vec3Normalize([next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]]);
    const side = vec3Normalize(vec3Cross(tangent, [0, 1, 0]));
    const fallback = Math.hypot(side[0], side[1], side[2]) < 0.001 ? [1, 0, 0] : side;
    appendVertex(mesh, [point[0] + fallback[0] * width, point[1] + fallback[1] * width, point[2] + fallback[2] * width], [0, 1, 0], color, [0, i / points.length]);
    appendVertex(mesh, [point[0] - fallback[0] * width, point[1] - fallback[1] * width, point[2] - fallback[2] * width], [0, 1, 0], color, [1, i / points.length]);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = i * 2;
    mesh.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return mesh;
}

function createProgram(gl, vertexSource, fragmentSource) {
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${message}`);
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${message}`);
  }
  return program;
}

function createMeshResource(gl, meshData) {
  const vao = gl.createVertexArray();
  const position = gl.createBuffer();
  const normal = gl.createBuffer();
  const color = gl.createBuffer();
  const uv = gl.createBuffer();
  const index = gl.createBuffer();
  const indices = meshData.indices.length > 65535 ? new Uint32Array(meshData.indices) : new Uint16Array(meshData.indices);

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.colors), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.uvs), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);

  return {
    vao,
    buffers: [position, normal, color, uv, index],
    count: indices.length,
    indexType: indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
  };
}

function disposeMeshResource(gl, resource) {
  if (!resource) return;
  gl.deleteVertexArray(resource.vao);
  for (const buffer of resource.buffers ?? []) {
    gl.deleteBuffer(buffer);
  }
}

const LIT_VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vColor;
out vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  vColor = aColor;
  vUv = aUv;
  gl_Position = uViewProj * world;
}`;

const LIT_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColor;
in vec2 vUv;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uExposure;
uniform float uAlpha;
uniform float uRoughness;
out vec4 outColor;
vec3 toneMap(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec3 n = normalize(vNormal);
  float ndl = max(dot(n, normalize(uSunDir)), 0.0);
  float sky = n.y * 0.5 + 0.5;
  vec3 ambient = mix(uGroundColor, uSkyColor, sky) * 0.52;
  float wetGlint = pow(max(dot(reflect(-normalize(uSunDir), n), normalize(vec3(-vWorld.x, 12.0 - vWorld.y, -24.0 - vWorld.z))), 0.0), mix(18.0, 80.0, 1.0 - uRoughness));
  vec3 color = vColor * (ambient + uSunColor * ndl * uSunIntensity * 0.42);
  color += uSunColor * wetGlint * (1.0 - uRoughness) * 0.28;
  float fog = 1.0 - exp(-length(vWorld) * uFogDensity);
  color = mix(color, uFogColor, clamp(fog, 0.0, 0.72));
  outColor = vec4(toneMap(color), uAlpha);
}`;

const WATER_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColor;
in vec2 vUv;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFogColor;
uniform float uTime;
uniform float uOpacity;
uniform float uRipple;
uniform float uFresnel;
uniform float uClarity;
uniform float uTurbidity;
uniform float uCaustics;
uniform float uExposure;
out vec4 outColor;
vec3 toneMap(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec3 viewDir = normalize(vec3(-vWorld.x, 8.0 - vWorld.y, -24.0 - vWorld.z));
  float facing = clamp(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 3.0) * uFresnel;
  float ripple = sin(vUv.x * 46.0 + uTime * 2.0) * 0.025 + sin(vUv.y * 38.0 - uTime * 1.6) * 0.02;
  float depth = smoothstep(0.12, 0.95, vUv.y);
  vec3 color = mix(uShallow, uDeep, clamp(depth + ripple + uTurbidity * 0.14, 0.0, 1.0));
  float caustic = (sin((vUv.x + vUv.y) * 92.0 + uTime * 2.6) * sin(vUv.x * 41.0 - uTime * 1.7)) * 0.5 + 0.5;
  caustic = smoothstep(0.72, 1.0, caustic) * (1.0 - depth) * uCaustics;
  float glint = smoothstep(0.82, 1.0, sin(vUv.x * 90.0 + uTime * 3.0) * 0.5 + 0.5) * max(dot(normalize(uSunDir), viewDir), 0.0);
  color += vec3(0.88, 0.96, 1.0) * fresnel * 0.28;
  color += vec3(0.7, 1.0, 0.88) * caustic * 0.18;
  color += uSunColor * glint * 0.16;
  color = mix(color, uFogColor, clamp(length(vWorld) * 0.0018, 0.0, 0.32));
  float alpha = clamp(uOpacity + ripple - uClarity * 0.12 + fresnel * 0.18, 0.16, 0.76);
  outColor = vec4(toneMap(color), alpha);
}`;

const SKY_VERTEX = `#version 300 es
const vec2 POSITIONS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vec2 p = POSITIONS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const SKY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec2 uSunScreen;
uniform float uCloudDensity;
uniform float uTime;
uniform float uExposure;
out vec4 outColor;
vec3 toneMap(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  float h = smoothstep(0.02, 0.96, vUv.y);
  vec3 color = mix(uHorizon, uTop, h);
  float sun = smoothstep(0.22, 0.0, distance(vUv, uSunScreen));
  float cloud = sin((vUv.x + uTime * 0.006) * 28.0) * sin((vUv.x * 0.7 + vUv.y + uTime * 0.004) * 19.0);
  cloud = smoothstep(0.55, 0.92, cloud * 0.5 + 0.5) * uCloudDensity * smoothstep(0.42, 0.95, vUv.y);
  color += uSunColor * sun * 0.36;
  color = mix(color, vec3(1.0), cloud * 0.36);
  outColor = vec4(toneMap(color), 1.0);
}`;

function setCommonLitUniforms(gl, program, viewProj, realism) {
  const lighting = realism.lighting ?? {};
  const hemi = lighting.hemisphere ?? {};
  const atmosphere = realism.atmosphere ?? {};
  const pipeline = realism.renderer ?? {};
  const sun = lighting.sun ?? {};
  const sunDirection = lighting.sunDirection ?? { x: -0.58, y: 0.47, z: 0.66 };
  const sunDir = vec3Normalize([number(sunDirection.x, -0.58), number(sunDirection.y, 0.47), number(sunDirection.z, 0.66)]);
  gl.uniformMatrix4fv(program.locations.viewProj, false, viewProj);
  gl.uniform3fv(program.locations.sunDir, sunDir);
  gl.uniform3fv(program.locations.sunColor, hexToRgb01(sun.color, [1, 0.95, 0.77]));
  gl.uniform1f(program.locations.sunIntensity, number(sun.intensity, 3.2));
  gl.uniform3fv(program.locations.skyColor, hexToRgb01(hemi.sky, [0.75, 0.91, 1]));
  gl.uniform3fv(program.locations.groundColor, hexToRgb01(hemi.ground, [0.72, 0.56, 0.38]));
  gl.uniform3fv(program.locations.fogColor, hexToRgb01(atmosphere.fogColor ?? atmosphere.horizon, [0.72, 0.85, 0.89]));
  gl.uniform1f(program.locations.fogDensity, number(atmosphere.haze, 0.015));
  gl.uniform1f(program.locations.exposure, number(pipeline.exposure, number(lighting.exposure, 1.05)));
}

function buildProgram(gl, vertex, fragment, locations) {
  const program = createProgram(gl, vertex, fragment);
  const out = { program, locations: {} };
  for (const [key, name] of Object.entries(locations)) {
    out.locations[key] = gl.getUniformLocation(program, name);
  }
  return out;
}

function drawMesh(gl, resource, mode = gl.TRIANGLES) {
  gl.bindVertexArray(resource.vao);
  gl.drawElements(mode, resource.count, resource.indexType, 0);
  gl.bindVertexArray(null);
}

function createCameraMatrices(size, rig = {}) {
  const target = [number(rig.target?.x), number(rig.target?.y), number(rig.target?.z, 8)];
  const yaw = degToRad(number(rig.yaw, 0));
  const pitch = degToRad(number(rig.pitch, 10));
  const distance = number(rig.distance, 27) / number(rig.zoom, 1);
  const eye = [
    target[0] + Math.sin(yaw) * distance,
    target[1] + number(rig.height, 5.4) + Math.sin(pitch) * 8,
    target[2] - Math.cos(yaw) * distance
  ];
  const look = [target[0], target[1] + 0.2 + Math.sin(pitch) * 2, target[2] + 3];
  const projection = mat4Perspective(degToRad(50), size.width / size.height, 0.1, 260);
  const view = mat4LookAt(eye, look);
  return { eye, viewProj: mat4Multiply(projection, view) };
}

function waterPoint(point, y = -0.34) {
  return [number(point?.x), y, number(point?.y)];
}

function makeCurvePoints(start, end, lift, segments = 24) {
  const points = [];
  const mid = [
    lerp(start[0], end[0], 0.5),
    lerp(start[1], end[1], 0.5) + lift,
    lerp(start[2], end[2], 0.5)
  ];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    points.push([
      start[0] * a + mid[0] * b + end[0] * c,
      start[1] * a + mid[1] * b + end[1] * c,
      start[2] * a + mid[2] * b + end[2] * c
    ]);
  }
  return points;
}

export function createFishingHeadlessRenderer(config = {}) {
  const frames = [];
  return {
    rendererType: "headless",
    config,
    frames,
    lastFrameMs: 0,
    resize() {},
    renderFishing(snapshot) {
      frames.push({ at: Date.now(), snapshot });
      return snapshot;
    },
    dispose() {
      frames.length = 0;
    }
  };
}

export function createFishingCanvas2DRenderer(config = {}) {
  const root = resolveRoot(config.root);
  const size = getSize(root);
  const canvas = config.canvas ?? (typeof document !== "undefined" ? document.createElement("canvas") : null);
  const ctx = canvas?.getContext?.("2d") ?? null;
  const api = {
    rendererType: "canvas2d",
    canvas,
    context: ctx,
    lastFrameMs: 0,
    resize,
    renderFishing,
    dispose() {
      canvas?.remove?.();
    }
  };

  if (canvas) {
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.background = "#09212c";
    if (root && !config.canvas) {
      root.appendChild(canvas);
    }
  }

  function resize() {
    if (!canvas) return;
    const next = getSize(root);
    canvas.width = next.width;
    canvas.height = next.height;
  }

  function renderFishing(snapshot = {}) {
    const frameStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!ctx || !canvas) {
      return snapshot;
    }

    const size = { width: canvas.width, height: canvas.height };
    const time = Number(snapshot.clock?.elapsed ?? 0);
    const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
    gradient.addColorStop(0, "#0c3448");
    gradient.addColorStop(0.55, "#0d5066");
    gradient.addColorStop(1, "#0a1d27");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "rgba(150, 230, 255, 0.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i += 1) {
      const y = ((i * 47 + time * 18) % (size.height + 80)) - 40;
      ctx.beginPath();
      for (let x = -20; x <= size.width + 20; x += 24) {
        const wave = Math.sin(x * 0.018 + time + i) * 6;
        if (x === -20) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    for (const zone of snapshot.waterZones ?? []) {
      const pos = worldToScreen(zone.position, size);
      ctx.fillStyle = zoneStyle(zone.kind);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, Number(zone.radius ?? 4) * 14, Number(zone.radius ?? 4) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const fish of snapshot.fish ?? []) {
      const pos = worldToScreen(fish.position, size);
      ctx.fillStyle = fish.hooked ? "#ffcf5a" : "rgba(98, 220, 232, 0.82)";
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 18, 7, Math.sin(time + fish.entity) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    const lure = snapshot.lure;
    if (lure) {
      const pos = worldToScreen(lure.position, size);
      const player = worldToScreen({ x: 0, y: 18 }, size);
      ctx.strokeStyle = snapshot.tension?.danger ? "#ff7057" : "#f8e7a1";
      ctx.lineWidth = 2 + Number(snapshot.tension?.current ?? 0) * 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    api.lastFrameMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - frameStart;
    return snapshot;
  }

  return api;
}

export function createFishingWebGLRenderer(config = {}) {
  const root = resolveRoot(config.root);
  const initialSize = getSize(root);
  const canvas = config.canvas ?? (typeof document !== "undefined" ? document.createElement("canvas") : null);
  const gl = canvas?.getContext?.("webgl2", { antialias: true, alpha: true, depth: true, stencil: false }) ?? null;

  if (!canvas || !gl) {
    return createFishingCanvas2DRenderer({ ...config, rendererType: "canvas2d" });
  }

  if (root && !config.canvas) {
    root.appendChild(canvas);
  }
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  const litProgram = buildProgram(gl, LIT_VERTEX, LIT_FRAGMENT, {
    model: "uModel",
    viewProj: "uViewProj",
    sunDir: "uSunDir",
    sunColor: "uSunColor",
    sunIntensity: "uSunIntensity",
    skyColor: "uSkyColor",
    groundColor: "uGroundColor",
    fogColor: "uFogColor",
    fogDensity: "uFogDensity",
    exposure: "uExposure",
    alpha: "uAlpha",
    roughness: "uRoughness"
  });
  const waterProgram = buildProgram(gl, LIT_VERTEX, WATER_FRAGMENT, {
    model: "uModel",
    viewProj: "uViewProj",
    sunDir: "uSunDir",
    sunColor: "uSunColor",
    deep: "uDeep",
    shallow: "uShallow",
    fogColor: "uFogColor",
    time: "uTime",
    opacity: "uOpacity",
    ripple: "uRipple",
    fresnel: "uFresnel",
    clarity: "uClarity",
    turbidity: "uTurbidity",
    caustics: "uCaustics",
    exposure: "uExposure"
  });
  const skyProgram = buildProgram(gl, SKY_VERTEX, SKY_FRAGMENT, {
    top: "uTop",
    horizon: "uHorizon",
    sunColor: "uSunColor",
    sunScreen: "uSunScreen",
    cloudDensity: "uCloudDensity",
    time: "uTime",
    exposure: "uExposure"
  });

  const identity = mat4Identity();
  const waterSize = number(config.water?.surfaceSize, 240);
  const waterSegments = Math.max(32, Math.min(160, Math.floor(number(config.water?.surfaceResolution, 96))));
  const staticMeshes = {
    water: createMeshResource(gl, createPlaneMeshData(waterSize, waterSize, waterSegments, [1, 1, 1])),
    foam: createMeshResource(gl, createPlaneMeshData(number(config.water?.foamWidth, waterSize * 0.28), 1.2, 1, [0.95, 1, 0.95])),
    disk: createMeshResource(gl, createDiskMeshData(48, [1, 1, 1])),
    ring: createMeshResource(gl, createRingMeshData(64, 0.84, [0.79, 1, 0.95])),
    sphere: createMeshResource(gl, createSphereMeshData(20, 12, [1, 1, 1])),
    cone: createMeshResource(gl, createConeMeshData(6, [1, 1, 1])),
    cloud: createMeshResource(gl, createDiskMeshData(36, [1, 1, 1])),
    shadow: createMeshResource(gl, createDiskMeshData(32, [0.03, 0.03, 0.025]))
  };
  let fallbackTerrain = null;
  let fallbackTerrainSignature = "";
  const terrainChunks = new Map();
  const scatterMeshes = new Map();
  let lineMesh = null;
  const api = {
    rendererType: "custom-webgl",
    sceneMode: config.sceneMode ?? "beach-side",
    backend: "webgl2",
    canvas,
    gl,
    lastFrameMs: 0,
    resize,
    renderFishing,
    dispose
  };

  resize(initialSize);

  function resize(forced = null) {
    const size = forced ?? getSize(root);
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, number(config.pixelRatio, 2));
    const width = Math.max(1, Math.floor(size.width * pixelRatio));
    const height = Math.max(1, Math.floor(size.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function drawLit(resource, model, viewProj, realism, options = {}) {
    gl.useProgram(litProgram.program);
    setCommonLitUniforms(gl, litProgram, viewProj, realism);
    gl.uniformMatrix4fv(litProgram.locations.model, false, model);
    gl.uniform1f(litProgram.locations.alpha, number(options.alpha, 1));
    gl.uniform1f(litProgram.locations.roughness, number(options.roughness, 0.78));
    drawMesh(gl, resource);
  }

  function drawWater(resource, model, viewProj, realism, waterConfig, time) {
    const lighting = realism.lighting ?? {};
    const atmosphere = realism.atmosphere ?? {};
    const pipeline = realism.renderer ?? {};
    const sun = lighting.sun ?? {};
    const sunDirection = lighting.sunDirection ?? { x: -0.58, y: 0.47, z: 0.66 };
    gl.useProgram(waterProgram.program);
    gl.uniformMatrix4fv(waterProgram.locations.model, false, model);
    gl.uniformMatrix4fv(waterProgram.locations.viewProj, false, viewProj);
    gl.uniform3fv(waterProgram.locations.sunDir, vec3Normalize([number(sunDirection.x, -0.58), number(sunDirection.y, 0.47), number(sunDirection.z, 0.66)]));
    gl.uniform3fv(waterProgram.locations.sunColor, hexToRgb01(sun.color, [1, 0.95, 0.77]));
    gl.uniform3fv(waterProgram.locations.deep, hexToRgb01(realism.water?.depthTint ?? waterConfig.depthTint, [0.12, 0.5, 0.56]));
    gl.uniform3fv(waterProgram.locations.shallow, hexToRgb01(realism.water?.shallowTint ?? waterConfig.shallowTint, [0.45, 0.86, 0.82]));
    gl.uniform3fv(waterProgram.locations.fogColor, hexToRgb01(atmosphere.fogColor ?? atmosphere.horizon, [0.72, 0.85, 0.89]));
    gl.uniform1f(waterProgram.locations.time, time);
    gl.uniform1f(waterProgram.locations.opacity, number(realism.water?.opacity, number(waterConfig.opacity, waterConfig.transparent === false ? 1 : 0.42)));
    gl.uniform1f(waterProgram.locations.ripple, number(realism.water?.rippleScale, number(waterConfig.rippleStrength, 0.35)));
    gl.uniform1f(waterProgram.locations.fresnel, number(realism.water?.fresnel, 0.65));
    gl.uniform1f(waterProgram.locations.clarity, number(realism.water?.clarity, number(waterConfig.clarity, 0.78)));
    gl.uniform1f(waterProgram.locations.turbidity, number(realism.water?.turbidity, 0.18));
    gl.uniform1f(waterProgram.locations.caustics, realism.water?.caustics === false ? 0 : 1);
    gl.uniform1f(waterProgram.locations.exposure, number(pipeline.exposure, number(lighting.exposure, 1.05)));
    drawMesh(gl, resource);
  }

  function drawSky(realism, time, cloudDensity) {
    const atmosphere = realism.atmosphere ?? {};
    const lighting = realism.lighting ?? {};
    const pipeline = realism.renderer ?? {};
    const sun = lighting.sun ?? {};
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(skyProgram.program);
    gl.uniform3fv(skyProgram.locations.top, hexToRgb01(atmosphere.zenith, [0.45, 0.72, 0.86]));
    gl.uniform3fv(skyProgram.locations.horizon, hexToRgb01(atmosphere.horizon, [0.96, 0.85, 0.67]));
    gl.uniform3fv(skyProgram.locations.sunColor, hexToRgb01(sun.color, [1, 0.95, 0.77]));
    gl.uniform2fv(skyProgram.locations.sunScreen, [0.28, 0.72]);
    gl.uniform1f(skyProgram.locations.cloudDensity, cloudDensity);
    gl.uniform1f(skyProgram.locations.time, time);
    gl.uniform1f(skyProgram.locations.exposure, number(pipeline.exposure, number(lighting.exposure, 1.05)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }

  function ensureFallbackTerrain(terrain) {
    const signature = JSON.stringify({
      width: terrain.width,
      depth: terrain.depth,
      resolution: terrain.resolution,
      shorelineZ: terrain.shorelineZ,
      beachColor: terrain.beachColor,
      wetSandColor: terrain.wetSandColor,
      seaFloorColor: terrain.seaFloorColor
    });
    if (fallbackTerrain && signature === fallbackTerrainSignature) return fallbackTerrain;
    disposeMeshResource(gl, fallbackTerrain);
    fallbackTerrain = createMeshResource(gl, createTerrainMeshData(terrain));
    fallbackTerrainSignature = signature;
    return fallbackTerrain;
  }

  function ensureTerrainChunks(chunks = []) {
    const live = new Set();
    for (const chunk of chunks) {
      const id = chunk.id ?? `${chunk.cx},${chunk.cz}`;
      live.add(id);
      const revision = `${chunk.version}:${chunk.lod?.resolution ?? chunk.resolution}`;
      const current = terrainChunks.get(id);
      if (current?.revision === revision) continue;
      disposeMeshResource(gl, current?.resource);
      terrainChunks.set(id, {
        revision,
        resource: createMeshResource(gl, createTerrainChunkMeshData(chunk))
      });
    }
    for (const [id, item] of terrainChunks.entries()) {
      if (!live.has(id)) {
        disposeMeshResource(gl, item.resource);
        terrainChunks.delete(id);
      }
    }
  }

  function createScatterMeshData(chunks, realism) {
    const scatter = realism.scatter ?? {};
    const density = clamp(number(scatter.effectiveDensity, number(scatter.density, 0.72)), 0, 1);
    const mesh = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
    let index = 0;
    function addBlade(x, y, z, height, width, color, rotation) {
      const side = [Math.cos(rotation) * width, 0, Math.sin(rotation) * width];
      const normal = vec3Normalize([Math.sin(rotation), 0.4, -Math.cos(rotation)]);
      appendVertex(mesh, [x - side[0], y, z - side[2]], normal, color, [0, 0]);
      appendVertex(mesh, [x + side[0], y, z + side[2]], normal, color, [1, 0]);
      appendVertex(mesh, [x, y + height, z], normal, color, [0.5, 1]);
      mesh.indices.push(index, index + 1, index + 2);
      index += 3;
    }

    for (const chunk of chunks) {
      const resolution = Math.max(2, Math.floor(number(chunk.resolution ?? chunk.lod?.resolution, 8)));
      const size = resolution + 1;
      const heights = chunk.heightField;
      const scatterField = chunk.scatterMaskField;
      if (!heights || !scatterField) continue;
      const maxCount = Math.floor(number(scatter.maxPerChunk, 46) * density);
      let count = 0;
      const step = Math.max(1, Math.floor(resolution / 9));
      for (let zIndex = 0; zIndex <= resolution; zIndex += step) {
        for (let xIndex = 0; xIndex <= resolution; xIndex += step) {
          if (count >= maxCount) break;
          const i = zIndex * size + xIndex;
          const mask = number(scatterField[i], 0);
          const seed = `${chunk.id}:${xIndex}:${zIndex}:${scatter.seed ?? "scatter"}`;
          const roll = deterministic01(seed);
          if (mask * density < roll * 0.86) continue;
          const x = number(chunk.bounds.minX) + (xIndex / resolution) * chunk.size;
          const z = number(chunk.bounds.minZ) + (zIndex / resolution) * chunk.size;
          const y = number(heights[i]) + 0.02;
          const shore = number(chunk.shorelineMaskField?.[i], 0);
          const wet = number(chunk.wetnessField?.[i], 0);
          let color = [0.48, 0.56, 0.31];
          let height = 0.38;
          let width = 0.06;
          if (shore > 0.62 && wet > 0.42) {
            color = roll > 0.64 ? [0.3, 0.45, 0.27] : [0.9, 0.64, 0.55];
            height = roll > 0.64 ? 0.82 : 0.3;
          } else if (wet > 0.22 && roll > 0.82) {
            color = [0.35, 0.54, 0.4];
            height = 0.9;
          } else if (roll > 0.78) {
            color = [0.55, 0.54, 0.49];
            height = 0.12;
            width = 0.13;
          } else if (shore > 0.62 && roll > 0.54) {
            color = [0.9, 0.85, 0.74];
            height = 0.12;
            width = 0.12;
          }
          const scale = 0.65 + deterministic01(`${seed}:scale`) * 0.95;
          const rotation = deterministic01(`${seed}:rot`) * Math.PI * 2;
          addBlade(x, y, z, height * scale, width * scale, color, rotation);
          count += 1;
        }
      }
    }
    return mesh.indices.length ? mesh : null;
  }

  function ensureScatter(chunks, realism) {
    const scatter = realism.scatter ?? {};
    const density = clamp(number(scatter.effectiveDensity, number(scatter.density, 0.72)), 0, 1);
    const signature = `${density.toFixed(3)}:${chunks.map((chunk) => `${chunk.id}:${chunk.version}:${chunk.lod?.resolution ?? chunk.resolution}`).join("|")}`;
    const current = scatterMeshes.get("main");
    if (current?.signature === signature) return current.resource;
    disposeMeshResource(gl, current?.resource);
    const meshData = createScatterMeshData(chunks, realism);
    if (!meshData) {
      scatterMeshes.delete("main");
      return null;
    }
    const resource = createMeshResource(gl, meshData);
    scatterMeshes.set("main", { signature, resource });
    return resource;
  }

  function drawDynamicMesh(meshData, model, viewProj, realism, options = {}) {
    const resource = createMeshResource(gl, meshData);
    drawLit(resource, model, viewProj, realism, options);
    disposeMeshResource(gl, resource);
  }

  function renderFishing(snapshot = {}) {
    const frameStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    resize();
    const size = { width: canvas.width, height: canvas.height };
    const time = number(snapshot.clock?.elapsed, 0);
    const realism = resolveRealism(snapshot, config.realism);
    const terrain = snapshot.terrain?.config ?? snapshot.terrain ?? {};
    const waterConfig = snapshot.water ?? {};
    const skyConfig = snapshot.sky ?? {};
    const { viewProj } = createCameraMatrices(size, snapshot.camera);
    const cloudDensity = number(snapshot.clouds?.density, number(skyConfig.cloudDensity, 0.68)) * number(realism.atmosphere?.cloudDensityScale, 0.9);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.45, 0.72, 0.86, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawSky(realism, time, cloudDensity);

    gl.depthMask(true);
    if (snapshot.terrainChunks?.length) {
      ensureTerrainChunks(snapshot.terrainChunks);
      for (const item of terrainChunks.values()) {
        drawLit(item.resource, identity, viewProj, realism, {
          roughness: number(realism.terrainMaterials?.sand?.roughness, 0.82)
        });
      }
      const scatter = ensureScatter(snapshot.terrainChunks, realism);
      if (scatter) {
        drawLit(scatter, identity, viewProj, realism, { roughness: 0.86 });
      }
    } else {
      drawLit(ensureFallbackTerrain(terrain), identity, viewProj, realism, {
        roughness: number(realism.terrainMaterials?.sand?.roughness, 0.82)
      });
    }

    gl.depthMask(false);
    for (const zone of snapshot.waterZones ?? []) {
      const color = zoneColor01(zone.kind);
      staticMeshes.disk.color = color;
      const model = mat4FromTranslationRotationScale(
        waterPoint(zone.position, zone.kind === "reef" ? 0.04 : -0.06),
        [0, 0, 0],
        zone.kind === "reef"
          ? [number(zone.radius, 4) * 0.42, 0.05, number(zone.radius, 4) * 0.38]
          : [number(zone.radius, 4), 1, number(zone.radius, 4) * 0.78]
      );
      const disk = createMeshResource(gl, createDiskMeshData(zone.kind === "reef" ? 8 : 48, color));
      drawLit(disk, model, viewProj, realism, { alpha: zone.kind === "reef" ? 0.9 : 0.28, roughness: 0.72 });
      disposeMeshResource(gl, disk);
    }

    const waterLevel = number(waterConfig.level, 0) + 0.03;
    drawWater(
      staticMeshes.water,
      mat4FromTranslationRotationScale([0, waterLevel, 0]),
      viewProj,
      realism,
      waterConfig,
      time
    );
    drawLit(
      staticMeshes.foam,
      mat4FromTranslationRotationScale([0, waterLevel + 0.018, number(terrain.shorelineZ, -2)], [0, 0, 0], [0.95 + Math.sin(time * 0.7) * 0.008, 1, 1]),
      viewProj,
      realism,
      { alpha: realism.water?.foam?.enabled === false ? 0 : number(waterConfig.foam, 0.18), roughness: 0.45 }
    );

    gl.depthMask(true);
    for (const fish of snapshot.fish ?? []) {
      const hooked = Boolean(fish.hooked);
      const color = hooked ? [1, 0.81, 0.35] : [0.39, 0.85, 0.9];
      const fishMesh = createMeshResource(gl, createSphereMeshData(20, 10, color));
      const position = waterPoint(fish.position, -0.55 - number(fish.size, 1) * 0.08);
      const model = mat4FromTranslationRotationScale(
        position,
        [0, Math.sin(time * 2 + fish.entity) * 0.45, 0],
        [1.0 + number(fish.size, 1) * 0.14, 0.23 + number(fish.size, 1) * 0.04, 0.42]
      );
      drawLit(staticMeshes.shadow, mat4FromTranslationRotationScale([position[0] + 0.2, waterLevel + 0.005, position[2] - 0.15], [0, 0, 0], [0.8, 1, 0.38]), viewProj, realism, { alpha: 0.14, roughness: 1 });
      drawLit(fishMesh, model, viewProj, realism, { roughness: hooked ? 0.32 : 0.24 });
      disposeMeshResource(gl, fishMesh);
    }

    let lurePosition = null;
    if (snapshot.lure) {
      lurePosition = waterPoint(snapshot.lure.position, -0.16 + Math.sin(time * 7) * 0.03);
      const lureMesh = createMeshResource(gl, createSphereMeshData(18, 10, [1, 0.82, 0.4]));
      drawLit(lureMesh, mat4FromTranslationRotationScale(lurePosition, [0, time * 0.8, 0], [0.32, 0.32, 0.32]), viewProj, realism, { roughness: 0.18 });
      disposeMeshResource(gl, lureMesh);

      if (realism.wildlife?.lure?.contactRings !== false) {
        const ringPulse = 1 + (Math.sin(time * 5.6) * 0.5 + 0.5) * 0.42;
        drawLit(
          staticMeshes.ring,
          mat4FromTranslationRotationScale([lurePosition[0], waterLevel + 0.045, lurePosition[2]], [0, 0, 0], [ringPulse, 1, ringPulse]),
          viewProj,
          realism,
          { alpha: 0.18 + (1 - (ringPulse - 1) / 0.42) * 0.28, roughness: 0.2 }
        );
      }

      const rod = [0, 2.3, -15];
      const lift = 0.9 - number(snapshot.tension?.current, 0) * 0.6;
      const points = makeCurvePoints(rod, lurePosition, lift);
      disposeMeshResource(gl, lineMesh);
      lineMesh = createMeshResource(gl, createLineMeshData(points, 0.025, snapshot.tension?.danger ? [1, 0.44, 0.34] : [0.97, 0.91, 0.63]));
      drawLit(lineMesh, identity, viewProj, realism, { alpha: 1, roughness: 0.42 });
    }

    gl.depthMask(false);
    for (let i = 0; i < 16; i += 1) {
      const opacity = 0.12 + cloudDensity * (i % 2 === 0 ? 0.42 : 0.26);
      if (opacity <= 0.03) continue;
      const x = -28 + i * 4.1 + ((number(snapshot.clouds?.offset?.x) * 18) % 12) - 6;
      const y = 14 + Math.sin(i) * 1.4 + Math.sin(time * 0.08 + i) * 0.08;
      const z = 10 + Math.cos(i * 0.7) * 4 + number(snapshot.clouds?.offset?.y) * 12;
      const scaleX = (3.1 + (i % 4) * 0.3) * (1 + cloudDensity * 0.32);
      drawLit(
        staticMeshes.cloud,
        mat4FromTranslationRotationScale([x, y, z], [degToRad(-8), 0, 0], [scaleX, 1, 0.8]),
        viewProj,
        realism,
        { alpha: opacity, roughness: 1 }
      );
    }
    gl.depthMask(true);

    api.lastFrameMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - frameStart;
    return snapshot;
  }

  function dispose() {
    for (const mesh of Object.values(staticMeshes)) disposeMeshResource(gl, mesh);
    disposeMeshResource(gl, fallbackTerrain);
    disposeMeshResource(gl, lineMesh);
    for (const item of terrainChunks.values()) disposeMeshResource(gl, item.resource);
    for (const item of scatterMeshes.values()) disposeMeshResource(gl, item.resource);
    for (const program of [litProgram, waterProgram, skyProgram]) gl.deleteProgram(program.program);
    canvas.remove?.();
  }

  return api;
}

export function createFishingThreeRenderer(config = {}) {
  return createFishingWebGLRenderer({ ...config, rendererType: "custom-webgl" });
}

export function createFishingRenderer(type = "headless", config = {}) {
  if (type === "canvas2d") return createFishingCanvas2DRenderer(config);
  if (type === "custom-webgl" || type === "webgl2" || type === "three") {
    return createFishingWebGLRenderer(config);
  }
  return createFishingHeadlessRenderer(config);
}
