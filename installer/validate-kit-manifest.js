export function validateKitManifest(manifest) {
  const errors = [];
  const distributedRuntime = manifest?.status === "official" || manifest?.status === "deprecated";
  if (!manifest || typeof manifest !== "object") errors.push("manifest must be an object");
  for (const field of ["id", "version", "status", "domain", "domainPath", "apiName", "factory", "entry"]) {
    if (!manifest?.[field]) errors.push(`manifest.${field} is required`);
  }
  if (manifest?.domainPath && !manifest.domainPath.startsWith("n:")) errors.push("manifest.domainPath must start with n:");
  if (manifest?.apiName && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(manifest.apiName)) errors.push("manifest.apiName must be a JavaScript identifier");
  if (!Array.isArray(manifest?.provides)) errors.push("manifest.provides must be an array");
  if (!Array.isArray(manifest?.requires)) errors.push("manifest.requires must be an array");
  if (!manifest?.promotion || typeof manifest.promotion.resolved !== "boolean") errors.push("manifest.promotion.resolved is required");
  if (manifest?.promotion?.resolved === false && !manifest.promotion.blocker) errors.push("unresolved manifests require promotion.blocker");
  if (distributedRuntime && !manifest.realBehavior) errors.push(`${manifest.status} manifests require realBehavior`);
  if (distributedRuntime && !manifest.integrity) errors.push(`${manifest.status} manifests require integrity`);
  if (distributedRuntime && !manifest.packageExport) errors.push(`${manifest.status} manifests require packageExport`);
  return { ok: errors.length === 0, errors };
}

export function assertValidKitManifest(manifest) {
  const result = validateKitManifest(manifest);
  if (!result.ok) throw new TypeError(`Invalid kit manifest: ${result.errors.join("; ")}`);
  return manifest;
}
