import {
  COMPOSITION_REGISTRY_SCHEMA,
  normalizeRegistrySnapshot
} from "nexusengine/domains/composition/registry";

export const TRUSTED_REGISTRY_OWNERS = Object.freeze([
  "LuminaryLabs-Dev",
  "LuminaryLabs-Agents",
  "LuminaryLabs-Publish"
]);

const FULL_SHA = /^[a-f0-9]{40}$/i;
const clone = (value) => value == null ? value : structuredClone(value);

export function isImmutableCommit(value) {
  return FULL_SHA.test(String(value ?? ""));
}

function sourceId(source = {}) {
  if (source.registryId || source.id) return String(source.registryId ?? source.id);
  if (source.owner && source.repository) return `${source.owner}/${source.repository}`;
  return null;
}

function externalPinFor(id, options = {}) {
  const pins = options.externalRegistries ?? options.allowedExternalRegistries ?? {};
  if (pins instanceof Map) return pins.get(id) ?? null;
  return pins[id] ?? null;
}

function repositoryIdentity(snapshot, options = {}) {
  const source = snapshot.sources?.find((entry) => entry.registryId === snapshot.registryId) ?? snapshot.sources?.[0] ?? {};
  return {
    registryId: snapshot.registryId ?? source.registryId,
    owner: options.owner ?? source.metadata?.owner ?? null,
    repository: options.repository ?? source.metadata?.repository ?? null,
    requestedRef: options.requestedRef ?? source.metadata?.requestedRef ?? "main"
  };
}

function assertTrust(identity, commit, options = {}) {
  const trustedOwners = new Set(options.trustedOwners ?? TRUSTED_REGISTRY_OWNERS);
  if (trustedOwners.has(identity.owner)) return true;
  const expected = externalPinFor(identity.registryId, options);
  if (!isImmutableCommit(expected)) {
    throw new TypeError(`External registry ${identity.registryId} requires an explicit full-SHA pin in externalRegistries.`);
  }
  if (expected.toLowerCase() !== commit.toLowerCase()) {
    throw new TypeError(`External registry ${identity.registryId} resolved to ${commit}, not approved pin ${expected}.`);
  }
  return false;
}

export function assertRegistryTrust(snapshot, options = {}) {
  const identity = repositoryIdentity(snapshot, options);
  const source = snapshot.sources?.find((entry) => entry.registryId === identity.registryId) ?? snapshot.sources?.[0];
  if (!isImmutableCommit(source?.sourceCommit)) {
    throw new TypeError(`Registry ${identity.registryId ?? "source"} requires a full immutable commit SHA.`);
  }
  return assertTrust(identity, source.sourceCommit, options);
}

export function hydrateCompositionRegistry(input, resolvedCommit, options = {}) {
  if (!isImmutableCommit(resolvedCommit)) {
    throw new TypeError(`Registry ${sourceId(input) ?? "source"} must resolve to a full immutable commit SHA.`);
  }
  if (input?.schema !== COMPOSITION_REGISTRY_SCHEMA) {
    throw new TypeError(`Unsupported Composition registry snapshot ${String(input?.schema ?? "<missing>")}.`);
  }
  const raw = clone(input);
  const identity = repositoryIdentity(raw, options);
  const trusted = assertTrust(identity, resolvedCommit, options);
  raw.sources = (raw.sources ?? []).map((source) => source.registryId === identity.registryId ? {
    ...source,
    sourceCommit: resolvedCommit.toLowerCase(),
    status: "available",
    metadata: {
      ...(source.metadata ?? {}),
      owner: identity.owner,
      repository: identity.repository,
      requestedRef: identity.requestedRef,
      immutable: true,
      trusted
    }
  } : source);
  raw.kits = (raw.kits ?? []).map((kit) => {
    if (kit.source?.registryId !== identity.registryId) return kit;
    const installable = kit.status === "official"
      && kit.metadata?.realBehavior === true
      && Boolean(kit.source?.subpath)
      && Boolean(kit.source?.exportName);
    return { ...kit, source: { ...(kit.source ?? {}), installable } };
  });
  return normalizeRegistrySnapshot(raw, {
    allowExternalParents: true,
    allowExternalReferences: true
  });
}

async function fetchJson(url, options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("pullRegistry requires fetch or a metadataResolver.");
  const response = await fetchImpl(url, { headers: options.headers });
  if (!response?.ok) throw new Error(`Registry metadata request failed (${response?.status ?? "unknown"}): ${url}`);
  return response.json();
}

async function defaultMetadataResolver(source, options = {}) {
  if (typeof source === "string" && /^https?:\/\//.test(source)) {
    if (!isImmutableCommit(options.resolvedCommit)) {
      throw new TypeError("Direct registry URLs require options.resolvedCommit as a full SHA.");
    }
    return { registry: await fetchJson(source, options), resolvedCommit: options.resolvedCommit, metadataUrl: source };
  }

  const descriptor = typeof source === "string"
    ? (() => {
        const [owner, repository] = source.split("/");
        return { owner, repository };
      })()
    : source;
  if (!descriptor?.owner || !descriptor?.repository) throw new TypeError("Registry sources require owner and repository.");
  const requestedRef = descriptor.requestedRef ?? descriptor.ref ?? "main";
  const commitUrl = `https://api.github.com/repos/${encodeURIComponent(descriptor.owner)}/${encodeURIComponent(descriptor.repository)}/commits/${encodeURIComponent(requestedRef)}`;
  const commit = await fetchJson(commitUrl, options);
  if (!isImmutableCommit(commit.sha)) throw new TypeError("Registry source resolver did not return a full commit SHA.");
  const metadataUrl = descriptor.url ?? `https://raw.githubusercontent.com/${encodeURIComponent(descriptor.owner)}/${encodeURIComponent(descriptor.repository)}/${commit.sha}/nexusengine.registry.json`;
  return { registry: await fetchJson(metadataUrl, options), resolvedCommit: commit.sha, metadataUrl };
}

export async function pullRegistry(source, options = {}) {
  let resolved;
  if (source?.registry) {
    resolved = {
      registry: source.registry,
      resolvedCommit: source.resolvedCommit,
      metadataUrl: source.metadataUrl ?? null
    };
  } else if (source?.schema === COMPOSITION_REGISTRY_SCHEMA) {
    resolved = { registry: source, resolvedCommit: options.resolvedCommit, metadataUrl: null };
  } else {
    const resolver = options.metadataResolver ?? defaultMetadataResolver;
    resolved = await resolver(source, options);
  }
  if (!resolved?.registry || !isImmutableCommit(resolved.resolvedCommit)) {
    throw new TypeError(`Registry ${sourceId(resolved?.registry ?? source) ?? "source"} must resolve to a full immutable commit SHA.`);
  }
  const snapshot = hydrateCompositionRegistry(resolved.registry, resolved.resolvedCommit, {
    ...options,
    owner: options.owner ?? source?.owner,
    repository: options.repository ?? source?.repository,
    requestedRef: options.requestedRef ?? source?.requestedRef ?? source?.ref
  });
  return Object.freeze({ ...snapshot, metadataUrl: resolved.metadataUrl ?? null });
}
