export function validateKitManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") errors.push("manifest must be an object");
  if (!manifest?.id) errors.push("manifest.id is required");
  if (!manifest?.domain) errors.push("manifest.domain is required");
  if (!manifest?.factory) errors.push("manifest.factory is required");
  if (!manifest?.entry) errors.push("manifest.entry is required");
  if (!Array.isArray(manifest?.provides)) errors.push("manifest.provides must be an array");
  if (!Array.isArray(manifest?.requires)) errors.push("manifest.requires must be an array");
  return { ok: errors.length === 0, errors };
}

export function assertValidKitManifest(manifest) {
  const result = validateKitManifest(manifest);
  if (!result.ok) {
    throw new TypeError(`Invalid kit manifest: ${result.errors.join("; ")}`);
  }
  return manifest;
}
