export function validateDomainManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") errors.push("domain manifest must be an object");
  if (!manifest?.id) errors.push("domain manifest id is required");
  if (!manifest?.label) errors.push("domain manifest label is required");
  if (!Array.isArray(manifest?.kits)) errors.push("domain manifest kits must be an array");
  return { ok: errors.length === 0, errors };
}

export function assertValidDomainManifest(manifest) {
  const result = validateDomainManifest(manifest);
  if (!result.ok) {
    throw new TypeError(`Invalid domain manifest: ${result.errors.join("; ")}`);
  }
  return manifest;
}
