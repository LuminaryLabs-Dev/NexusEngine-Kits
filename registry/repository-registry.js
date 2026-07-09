import {
  REPOSITORY_REGISTRY_SCHEMA_VERSION,
  TRUSTED_REGISTRY_OWNERS,
  createRepositoryRegistry,
  mergeRegistries,
  normalizeKitManifest,
  normalizeRepositoryRegistry,
  validateKitManifest,
  validateRepositoryRegistry
} from "../kits/registry/kit-registry-domain-kit/index.js";

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const FULL_SHA = /^[a-f0-9]{40}$/i;

export {
  REPOSITORY_REGISTRY_SCHEMA_VERSION,
  TRUSTED_REGISTRY_OWNERS,
  createRepositoryRegistry,
  mergeRegistries,
  normalizeKitManifest,
  normalizeRepositoryRegistry,
  validateKitManifest,
  validateRepositoryRegistry
};

export function isImmutableCommit(value) {
  return FULL_SHA.test(String(value ?? ""));
}

function sourceId(source = {}) {
  if (source.id) return String(source.id);
  if (source.owner && source.repository) return `${source.owner}/${source.repository}`;
  return null;
}

function externalPinFor(id, options = {}) {
  const pins = options.externalRegistries ?? options.allowedExternalRegistries ?? {};
  if (pins instanceof Map) return pins.get(id) ?? null;
  return pins[id] ?? null;
}

function assertTrust(registry, options = {}) {
  const trustedOwners = new Set(options.trustedOwners ?? TRUSTED_REGISTRY_OWNERS);
  const trusted = trustedOwners.has(registry.owner);
  if (trusted) return true;
  const expected = externalPinFor(registry.id, options);
  if (!isImmutableCommit(expected)) {
    throw new TypeError(`External registry ${registry.id} requires an explicit full-SHA pin in externalRegistries.`);
  }
  if (expected.toLowerCase() !== registry.resolvedCommit.toLowerCase()) {
    throw new TypeError(`External registry ${registry.id} resolved to ${registry.resolvedCommit}, not approved pin ${expected}.`);
  }
  return false;
}

export function assertRegistryTrust(registry, options = {}) {
  if (!isImmutableCommit(registry?.resolvedCommit) && options.allowLocalTemplate !== true) {
    throw new TypeError(`Registry ${registry?.id ?? "source"} requires a full immutable commit SHA.`);
  }
  return assertTrust(registry, options);
}

function immutableBrowserUrl(url, registry) {
  if (!url) return null;
  const commit = registry.resolvedCommit;
  let next = String(url).replaceAll("{resolvedCommit}", commit);
  if (next.includes(`@${registry.requestedRef}/`)) next = next.replace(`@${registry.requestedRef}/`, `@${commit}/`);
  if (/^https?:/.test(next) && !next.includes(commit)) {
    throw new TypeError(`Browser module URL is not locked to registry commit ${commit}: ${next}`);
  }
  return next;
}

function hydrateRegistry(input, resolvedCommit, options = {}) {
  const raw = clone(input);
  raw.resolvedCommit = resolvedCommit;
  raw.requestedRef = String(raw.requestedRef ?? raw.ref ?? options.requestedRef ?? "main");
  raw.kits = (raw.kits ?? []).map((manifest) => ({
    ...manifest,
    module: {
      ...(manifest.module ?? {}),
      browser: immutableBrowserUrl(manifest.module?.browser ?? manifest.moduleUrl, { ...raw, resolvedCommit })
    },
    source: {
      ...(manifest.source ?? {}),
      registryId: raw.id ?? `${raw.owner}/${raw.repository}`,
      owner: raw.owner,
      repository: raw.repository,
      requestedRef: raw.requestedRef,
      resolvedCommit,
      path: manifest.source?.path ?? manifest.entry ?? null
    }
  }));
  const report = validateRepositoryRegistry(raw, { requirePinned: true });
  if (!report.ok) throw new TypeError(`Invalid repository registry: ${report.errors.join("; ")}`);
  const registry = report.registry;
  const trusted = assertTrust(registry, options);
  return { ...registry, trusted };
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
    const resolvedCommit = options.resolvedCommit;
    if (!isImmutableCommit(resolvedCommit)) throw new TypeError("Direct registry URLs require options.resolvedCommit as a full SHA.");
    return { registry: await fetchJson(source, options), resolvedCommit, metadataUrl: source };
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
      resolvedCommit: source.resolvedCommit ?? source.registry.resolvedCommit,
      metadataUrl: source.metadataUrl ?? null
    };
  } else if (source?.kits && source?.owner && source?.repository) {
    resolved = { registry: source, resolvedCommit: options.resolvedCommit ?? source.resolvedCommit, metadataUrl: null };
  } else {
    const resolver = options.metadataResolver ?? defaultMetadataResolver;
    resolved = await resolver(source, options);
  }

  if (!resolved?.registry || !isImmutableCommit(resolved.resolvedCommit)) {
    throw new TypeError(`Registry ${sourceId(resolved?.registry ?? source) ?? "source"} must resolve to a full immutable commit SHA.`);
  }
  const registry = hydrateRegistry(resolved.registry, resolved.resolvedCommit, options);
  return Object.freeze({ ...registry, metadataUrl: resolved.metadataUrl ?? null });
}
