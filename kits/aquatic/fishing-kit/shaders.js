function cloneUniforms(uniforms = {}) {
  const out = {};
  for (const [key, value] of Object.entries(uniforms)) {
    out[key] = value && typeof value === "object" && "value" in value
      ? { value: value.value }
      : { value };
  }
  return out;
}

const DEFAULT_VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 3) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
}`;

const DEFAULT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uColor;
uniform float uAlpha;
out vec4 outColor;
void main() {
  outColor = vec4(uColor, uAlpha);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, String(source).trimStart());
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${message}`);
  }
  return shader;
}

function createWebGLProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource || DEFAULT_VERTEX);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource || DEFAULT_FRAGMENT);
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

export function createShaderRegistry(initial = []) {
  const shaders = new Map();

  const registry = {
    register(shader) {
      if (!shader || typeof shader.id !== "string" || shader.id.trim().length === 0) {
        throw new TypeError("Shader descriptors require an id.");
      }

      shaders.set(shader.id, {
        rendererType: "headless",
        uniforms: {},
        vertex: "",
        fragment: "",
        ...shader
      });
      return this.get(shader.id);
    },

    get(id) {
      return shaders.get(id) ?? null;
    },

    list(rendererType) {
      return Array.from(shaders.values()).filter((shader) =>
        !rendererType || shader.rendererType === rendererType || shader.rendererType === "all"
      );
    },

    createProgram(gl, id, uniformOverrides = {}) {
      const shader = this.get(id);
      if (!shader) {
        throw new Error(`Unknown shader: ${id}`);
      }
      if (!gl?.createProgram) {
        throw new TypeError("createProgram requires a WebGL-compatible context.");
      }

      return {
        program: createWebGLProgram(gl, shader.vertex, shader.fragment),
        uniforms: { ...cloneUniforms(shader.uniforms), ...cloneUniforms(uniformOverrides) },
        transparent: shader.transparent ?? false
      };
    }
  };

  for (const shader of initial) {
    registry.register(shader);
  }

  return registry;
}

export function createMaterialRegistry(initial = []) {
  const materials = new Map();

  const registry = {
    register(material) {
      if (!material || typeof material.id !== "string" || material.id.trim().length === 0) {
        throw new TypeError("Material descriptors require an id.");
      }

      materials.set(material.id, { rendererType: "headless", ...material });
      return this.get(material.id);
    },

    get(id) {
      return materials.get(id) ?? null;
    },

    list(rendererType) {
      return Array.from(materials.values()).filter((material) =>
        !rendererType || material.rendererType === rendererType || material.rendererType === "all"
      );
    }
  };

  for (const material of initial) {
    registry.register(material);
  }

  return registry;
}

export const fishingShaders = Object.freeze([
  {
    id: "transparent-water",
    rendererType: "custom-webgl",
    transparent: true,
    uniforms: {
      uTime: 0,
      uOpacity: 0.42,
      uRipple: 0.35
    },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      uniform float uTime;
      uniform float uRipple;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        vec3 p = aPosition;
        p.y += sin(aPosition.x * 0.16 + uTime * 1.4) * 0.035 * uRipple;
        gl_Position = uViewProj * uModel * vec4(p, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      out vec4 outColor;
      void main() {
        float ripple = sin(vUv.x * 46.0 + uTime * 2.0) * 0.025;
        vec3 shallow = vec3(0.45, 0.86, 0.82);
        vec3 deep = vec3(0.12, 0.50, 0.56);
        outColor = vec4(mix(shallow, deep, vUv.y + ripple), uOpacity + ripple);
      }
    `
  },
  {
    id: "shoreline-foam",
    rendererType: "custom-webgl",
    transparent: true,
    uniforms: { uTime: 0, uFoam: 0.42 },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uTime;
      uniform float uFoam;
      out vec4 outColor;
      void main() {
        float edge = smoothstep(0.15, 0.5, sin(vUv.x * 70.0 + uTime * 2.0) * 0.5 + 0.5);
        outColor = vec4(0.94, 1.0, 0.96, edge * uFoam);
      }
    `
  },
  {
    id: "water-ripple",
    rendererType: "custom-webgl",
    uniforms: {
      uTime: 0,
      uBase: { value: "#0f4f73" },
      uAccent: { value: "#67d8ff" }
    },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uTime;
      out vec4 outColor;
      void main() {
        float ripple = sin((vUv.x * 18.0) + uTime * 1.7) * 0.04 + sin((vUv.y * 24.0) - uTime * 1.2) * 0.03;
        vec3 deep = vec3(0.03, 0.20, 0.31);
        vec3 bright = vec3(0.25, 0.74, 0.92);
        vec3 color = mix(deep, bright, 0.24 + ripple);
        outColor = vec4(color, 1.0);
      }
    `
  },
  {
    id: "fish-shimmer",
    rendererType: "custom-webgl",
    uniforms: { uTime: 0 },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uTime;
      out vec4 outColor;
      void main() {
        float glint = 0.5 + 0.5 * sin(uTime * 5.0 + vUv.x * 8.0);
        outColor = vec4(0.22 + glint * 0.18, 0.70 + glint * 0.2, 0.82, 1.0);
      }
    `
  },
  {
    id: "lure-glow",
    rendererType: "custom-webgl",
    uniforms: { uTime: 0 },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uTime;
      out vec4 outColor;
      void main() {
        float pulse = 0.65 + 0.35 * sin(uTime * 7.0);
        outColor = vec4(1.0, 0.72 + pulse * 0.2, 0.22, 1.0);
      }
    `
  },
  {
    id: "line-tension",
    rendererType: "custom-webgl",
    uniforms: { uTension: 0 },
    vertex: DEFAULT_VERTEX,
    fragment: DEFAULT_FRAGMENT
  },
  {
    id: "rain-ring",
    rendererType: "custom-webgl",
    uniforms: { uTime: 0 },
    vertex: DEFAULT_VERTEX,
    fragment: DEFAULT_FRAGMENT
  },
  {
    id: "soft-clouds",
    rendererType: "custom-webgl",
    transparent: true,
    uniforms: { uDensity: 0.68 },
    vertex: `
      #version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 3) in vec2 aUv;
      uniform mat4 uModel;
      uniform mat4 uViewProj;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
      }
    `,
    fragment: `
      #version 300 es
      precision highp float;
      in vec2 vUv;
      uniform float uDensity;
      out vec4 outColor;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float alpha = smoothstep(0.5, 0.14, d) * uDensity;
        outColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `
  }
]);
