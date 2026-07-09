export function validateInstallPlan(plan = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const kitId of plan.kits ?? []) {
    if (seen.has(kitId)) warnings.push(`duplicate kit id in plan: ${kitId}`);
    seen.add(kitId);
  }

  if (!Array.isArray(plan.kits ?? [])) errors.push("plan.kits must be an array when provided");
  if (!Array.isArray(plan.domains ?? [])) errors.push("plan.domains must be an array when provided");
  if (!Array.isArray(plan.bundles ?? [])) errors.push("plan.bundles must be an array when provided");

  return { ok: errors.length === 0, errors, warnings };
}
