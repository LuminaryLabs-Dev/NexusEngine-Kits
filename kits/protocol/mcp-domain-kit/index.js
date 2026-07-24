import { defineDomainServiceKit } from "nexusengine";

export const MCP_DOMAIN_KIT_VERSION = "0.1.0";
export const MCP_REGISTRY_SCHEMA = "nexusengine.mcp.registry.v1";

const NAME_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const APPROVAL_MODES = new Set(["none", "required"]);

const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

function clone(value) {
  if (value === undefined) return undefined;
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function jsonClone(value, label = "value") {
  try {
    return JSON.parse(JSON.stringify(value, (_key, entry) => {
      if (typeof entry === "bigint") return entry.toString();
      if (typeof entry === "function" || typeof entry === "symbol") return undefined;
      return entry;
    }));
  } catch (error) {
    throw new TypeError(`${label} must be JSON-serializable: ${error.message}`);
  }
}

function stableName(value, label) {
  const name = String(value ?? "").trim();
  if (!NAME_PATTERN.test(name)) {
    throw new TypeError(`${label} must match ${NAME_PATTERN}.`);
  }
  return name;
}

function stableUri(value, label) {
  const uri = String(value ?? "").trim();
  if (!uri) throw new TypeError(`${label} requires a URI.`);
  try {
    new URL(uri);
  } catch {
    throw new TypeError(`${label} must be an absolute URI.`);
  }
  return uri;
}

function normalizeSchema(input, label, options = {}) {
  const schema = input == null
    ? { type: options.defaultType ?? "object", properties: {}, additionalProperties: false }
    : jsonClone(input, label);
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError(`${label} must be a JSON Schema object.`);
  }
  if (schema.$ref != null) {
    throw new TypeError(`${label} cannot use $ref; MCP provider schemas must be self-contained.`);
  }
  if (options.objectRoot !== false && schema.type !== "object") {
    throw new TypeError(`${label} must describe an object at its root.`);
  }
  return schema;
}

function valueTypeMatches(value, expected) {
  switch (expected) {
    case "null": return value === null;
    case "array": return Array.isArray(value);
    case "object": return value !== null && typeof value === "object" && !Array.isArray(value);
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "string": return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    default: return true;
  }
}

function validateSchemaValue(value, schema, path = "$") {
  if (schema === true) return [];
  if (schema === false) return [`${path} is rejected by schema.`];
  if (!schema || typeof schema !== "object") return [];

  const errors = [];
  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) errors.push(...validateSchemaValue(value, branch, path));
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((branch) => validateSchemaValue(value, branch, path).length === 0)) {
    errors.push(`${path} does not match any allowed schema.`);
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((branch) => validateSchemaValue(value, branch, path).length === 0).length;
    if (matches !== 1) errors.push(`${path} must match exactly one allowed schema.`);
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${path} must equal the declared constant.`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) {
    errors.push(`${path} must be one of the declared enum values.`);
  }

  const expectedTypes = asList(schema.type).filter(Boolean);
  if (expectedTypes.length && !expectedTypes.some((type) => valueTypeMatches(value, type))) {
    errors.push(`${path} must be ${expectedTypes.join(" or ")}.`);
    return errors;
  }

  if (typeof value === "string") {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${path} is shorter than minLength.`);
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) errors.push(`${path} is longer than maxLength.`);
    if (schema.pattern != null) {
      let pattern;
      try {
        pattern = new RegExp(String(schema.pattern));
      } catch {
        errors.push(`${path} has an invalid schema pattern.`);
      }
      if (pattern && !pattern.test(value)) errors.push(`${path} does not match the required pattern.`);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${path} is below minimum.`);
    if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${path} is above maximum.`);
    if (Number.isFinite(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) errors.push(`${path} is below exclusiveMinimum.`);
    if (Number.isFinite(schema.exclusiveMaximum) && value >= schema.exclusiveMaximum) errors.push(`${path} is above exclusiveMaximum.`);
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${path} has too few items.`);
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${path} has too many items.`);
    if (schema.items) {
      value.forEach((entry, index) => errors.push(...validateSchemaValue(entry, schema.items, `${path}[${index}]`)));
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    for (const key of asList(schema.required)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${path}.${key} is required.`);
    }
    for (const [key, entry] of Object.entries(value)) {
      if (properties[key]) {
        errors.push(...validateSchemaValue(entry, properties[key], `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed.`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        errors.push(...validateSchemaValue(entry, schema.additionalProperties, `${path}.${key}`));
      }
    }
  }
  return errors;
}

function normalizeTool(input, providerId) {
  if (typeof input?.handler !== "function") throw new TypeError(`MCP tool ${input?.name ?? "unknown"} requires a handler.`);
  const name = stableName(input.name, "MCP tool name");
  const approval = String(input.approval ?? "none");
  if (!APPROVAL_MODES.has(approval)) throw new TypeError(`MCP tool ${name} has unsupported approval mode ${approval}.`);
  return Object.freeze({
    providerId,
    name,
    title: input.title == null ? null : String(input.title),
    description: String(input.description ?? name),
    inputSchema: normalizeSchema(input.inputSchema, `MCP tool ${name} inputSchema`),
    outputSchema: input.outputSchema == null ? null : normalizeSchema(input.outputSchema, `MCP tool ${name} outputSchema`, { objectRoot: false }),
    annotations: Object.freeze(jsonClone(input.annotations ?? {}, `MCP tool ${name} annotations`)),
    approval,
    handler: input.handler
  });
}

function normalizeResource(input, providerId) {
  if (typeof input?.read !== "function") throw new TypeError(`MCP resource ${input?.uri ?? "unknown"} requires a read handler.`);
  const uri = stableUri(input.uri, "MCP resource");
  return Object.freeze({
    providerId,
    uri,
    name: stableName(input.name ?? uri.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-|-$/g, ""), "MCP resource name"),
    title: input.title == null ? null : String(input.title),
    description: input.description == null ? null : String(input.description),
    mimeType: String(input.mimeType ?? "application/json"),
    read: input.read
  });
}

function normalizePrompt(input, providerId) {
  if (typeof input?.render !== "function") throw new TypeError(`MCP prompt ${input?.name ?? "unknown"} requires a render handler.`);
  const name = stableName(input.name, "MCP prompt name");
  const argumentsList = asList(input.arguments).map((argument) => ({
    name: stableName(argument?.name, `MCP prompt ${name} argument`),
    description: argument?.description == null ? null : String(argument.description),
    required: argument?.required === true
  }));
  return Object.freeze({
    providerId,
    name,
    title: input.title == null ? null : String(input.title),
    description: input.description == null ? null : String(input.description),
    arguments: Object.freeze(argumentsList),
    render: input.render
  });
}

export function defineMcpProvider(input = {}) {
  const id = stableName(input.id, "MCP provider id");
  return Object.freeze({
    id,
    version: String(input.version ?? "0.0.0"),
    tools: Object.freeze(asList(input.tools).map((tool) => normalizeTool(tool, id))),
    resources: Object.freeze(asList(input.resources).map((resource) => normalizeResource(resource, id))),
    prompts: Object.freeze(asList(input.prompts).map((prompt) => normalizePrompt(prompt, id))),
    metadata: Object.freeze(jsonClone(input.metadata ?? {}, `MCP provider ${id} metadata`))
  });
}

export function defineMcpProviderTemplate(input = {}) {
  const id = stableName(input.id, "MCP provider template id");
  if (typeof input.instantiate !== "function") throw new TypeError(`MCP provider template ${id} requires instantiate(bindings).`);
  return Object.freeze({
    id,
    version: String(input.version ?? "0.0.0"),
    instantiate(bindings = {}) {
      return defineMcpProvider(input.instantiate(bindings));
    }
  });
}

function publicTool(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: clone(tool.inputSchema),
    ...(tool.outputSchema ? { outputSchema: clone(tool.outputSchema) } : {}),
    annotations: clone(tool.annotations),
    providerId: tool.providerId,
    approval: tool.approval
  };
}

function publicResource(resource) {
  return {
    uri: resource.uri,
    name: resource.name,
    title: resource.title,
    description: resource.description,
    mimeType: resource.mimeType,
    providerId: resource.providerId
  };
}

function publicPrompt(prompt) {
  return {
    name: prompt.name,
    title: prompt.title,
    description: prompt.description,
    arguments: clone(prompt.arguments),
    providerId: prompt.providerId
  };
}

function normalizeToolResult(value, outputSchema) {
  let result;
  if (value && typeof value === "object" && Array.isArray(value.content)) {
    result = jsonClone(value, "MCP tool result");
  } else {
    const structuredContent = value == null ? {} : jsonClone(value, "MCP tool result");
    result = {
      content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(structuredContent) }],
      ...(typeof value === "string" ? {} : { structuredContent })
    };
  }
  if (outputSchema && result.structuredContent !== undefined) {
    const errors = validateSchemaValue(result.structuredContent, outputSchema);
    if (errors.length) throw new TypeError(`MCP tool output failed schema validation: ${errors.join(" ")}`);
  }
  return result;
}

function normalizeResourceResult(resource, value) {
  if (value && typeof value === "object" && Array.isArray(value.contents)) {
    return jsonClone(value, `MCP resource ${resource.uri} result`);
  }
  const text = typeof value === "string" ? value : JSON.stringify(jsonClone(value ?? null));
  return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }] };
}

function normalizePromptResult(value) {
  if (value && typeof value === "object" && Array.isArray(value.messages)) {
    return jsonClone(value, "MCP prompt result");
  }
  const text = typeof value === "string" ? value : JSON.stringify(jsonClone(value ?? null));
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}

function createMcpRegistry(config, engine) {
  const providers = new Map();
  const tools = new Map();
  const resources = new Map();
  const prompts = new Map();
  let revision = 0;

  function removeProviderRecords(providerId) {
    for (const [name, record] of tools) if (record.providerId === providerId) tools.delete(name);
    for (const [uri, record] of resources) if (record.providerId === providerId) resources.delete(uri);
    for (const [name, record] of prompts) if (record.providerId === providerId) prompts.delete(name);
  }

  function assertAvailable(provider, options = {}) {
    const replacing = options.replace === true ? provider.id : null;
    for (const tool of provider.tools) {
      const existing = tools.get(tool.name);
      if (existing && existing.providerId !== replacing) throw new TypeError(`MCP tool collision: ${tool.name}.`);
    }
    for (const resource of provider.resources) {
      const existing = resources.get(resource.uri);
      if (existing && existing.providerId !== replacing) throw new TypeError(`MCP resource collision: ${resource.uri}.`);
    }
    for (const prompt of provider.prompts) {
      const existing = prompts.get(prompt.name);
      if (existing && existing.providerId !== replacing) throw new TypeError(`MCP prompt collision: ${prompt.name}.`);
    }
  }

  function registerProvider(input, options = {}) {
    const provider = input?.tools && input?.resources && input?.prompts && Object.isFrozen(input)
      ? input
      : defineMcpProvider(input);
    const existing = providers.get(provider.id);
    if (existing && options.replace !== true) throw new TypeError(`MCP provider collision: ${provider.id}.`);
    assertAvailable(provider, options);
    if (existing) removeProviderRecords(provider.id);
    providers.set(provider.id, provider);
    for (const tool of provider.tools) tools.set(tool.name, tool);
    for (const resource of provider.resources) resources.set(resource.uri, resource);
    for (const prompt of provider.prompts) prompts.set(prompt.name, prompt);
    revision += 1;
    return getProvider(provider.id);
  }

  function getProvider(id) {
    const provider = providers.get(String(id));
    if (!provider) return null;
    return {
      id: provider.id,
      version: provider.version,
      tools: provider.tools.map(publicTool),
      resources: provider.resources.map(publicResource),
      prompts: provider.prompts.map(publicPrompt),
      metadata: clone(provider.metadata)
    };
  }

  function getSnapshot() {
    return {
      schemaVersion: MCP_REGISTRY_SCHEMA,
      version: MCP_DOMAIN_KIT_VERSION,
      revision,
      providers: [...providers.keys()].sort().map(getProvider),
      tools: [...tools.values()].sort((left, right) => left.name.localeCompare(right.name)).map(publicTool),
      resources: [...resources.values()].sort((left, right) => left.uri.localeCompare(right.uri)).map(publicResource),
      prompts: [...prompts.values()].sort((left, right) => left.name.localeCompare(right.name)).map(publicPrompt)
    };
  }

  const api = {
    registerProvider,
    registerTemplate(template, bindings = {}, options = {}) {
      if (!template || typeof template.instantiate !== "function") {
        throw new TypeError("MCP provider template requires instantiate(bindings).");
      }
      return registerProvider(template.instantiate(bindings), options);
    },
    removeProvider(id) {
      const providerId = String(id);
      if (!providers.has(providerId)) return false;
      removeProviderRecords(providerId);
      providers.delete(providerId);
      revision += 1;
      return true;
    },
    getProvider,
    listProviders() { return [...providers.keys()].sort().map(getProvider); },
    listTools() { return getSnapshot().tools; },
    listResources() { return getSnapshot().resources; },
    listPrompts() { return getSnapshot().prompts; },
    async callTool(name, args = {}, context = {}) {
      const tool = tools.get(String(name));
      if (!tool) throw new RangeError(`Unknown MCP tool: ${name}.`);
      const input = args == null ? {} : jsonClone(args, `MCP tool ${tool.name} arguments`);
      const errors = validateSchemaValue(input, tool.inputSchema);
      if (errors.length) throw new TypeError(`MCP tool ${tool.name} arguments failed validation: ${errors.join(" ")}`);
      if (tool.approval === "required") {
        const authorize = context.authorize ?? config.authorize;
        const approved = typeof authorize === "function"
          ? await authorize({ tool: publicTool(tool), arguments: clone(input), context })
          : false;
        if (approved !== true) throw new Error(`MCP tool ${tool.name} requires explicit authorization.`);
      }
      const value = await tool.handler(clone(input), {
        engine,
        providerId: tool.providerId,
        signal: context.signal ?? null,
        metadata: context.metadata ?? null
      });
      return normalizeToolResult(value, tool.outputSchema);
    },
    async readResource(uri, context = {}) {
      const resource = resources.get(String(uri));
      if (!resource) throw new RangeError(`Unknown MCP resource: ${uri}.`);
      const value = await resource.read({
        engine,
        uri: resource.uri,
        providerId: resource.providerId,
        signal: context.signal ?? null,
        metadata: context.metadata ?? null
      });
      return normalizeResourceResult(resource, value);
    },
    async getPrompt(name, args = {}, context = {}) {
      const prompt = prompts.get(String(name));
      if (!prompt) throw new RangeError(`Unknown MCP prompt: ${name}.`);
      const input = args == null ? {} : jsonClone(args, `MCP prompt ${prompt.name} arguments`);
      for (const argument of prompt.arguments) {
        if (argument.required && !Object.prototype.hasOwnProperty.call(input, argument.name)) {
          throw new TypeError(`MCP prompt ${prompt.name} requires argument ${argument.name}.`);
        }
      }
      const value = await prompt.render(clone(input), {
        engine,
        providerId: prompt.providerId,
        signal: context.signal ?? null,
        metadata: context.metadata ?? null
      });
      return normalizePromptResult(value);
    },
    getState: getSnapshot,
    getSnapshot,
    snapshot: getSnapshot,
    reset() {
      providers.clear();
      tools.clear();
      resources.clear();
      prompts.clear();
      revision += 1;
      for (const provider of asList(config.providers)) registerProvider(provider);
      for (const entry of asList(config.templates)) {
        if (entry?.template) api.registerTemplate(entry.template, entry.bindings ?? {});
        else api.registerTemplate(entry, {});
      }
      return getSnapshot();
    }
  };

  api.reset();
  return Object.freeze(api);
}

export function createMcpDomainKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "mcp-domain-kit",
    domain: "mcp",
    domainPath: "n:mcp",
    apiName: "mcp",
    stability: "candidate",
    version: MCP_DOMAIN_KIT_VERSION,
    services: ["providers", "tools", "resources", "prompts", "snapshot"],
    provides: ["protocol:mcp", "mcp:registry", "mcp:tools", "mcp:resources", "mcp:prompts"],
    createApi({ engine }) {
      return createMcpRegistry(config, engine);
    },
    install({ engine }) {
      engine.mcp = engine.n.mcp;
    },
    metadata: {
      status: "candidate",
      scope: "optional-protocol-domain",
      ownsLoop: false,
      optIn: true,
      boundary: "Owns explicit MCP provider registration and protocol-facing invocation. Applications own exposure policy; adapters own transports; no Engine or DSK API is exposed automatically."
    }
  });
}

export default createMcpDomainKit;
