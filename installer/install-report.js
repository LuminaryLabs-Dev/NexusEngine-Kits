export function createInstallReport(fields = {}) {
  return {
    ok: fields.ok ?? true,
    operation: fields.operation ?? "install",
    kitId: fields.kitId ?? null,
    domainId: fields.domainId ?? null,
    bundleId: fields.bundleId ?? null,
    installed: fields.installed ?? false,
    duplicate: fields.duplicate ?? false,
    warnings: fields.warnings ?? [],
    errors: fields.errors ?? [],
    meta: fields.meta ?? {}
  };
}

export function mergeInstallReports(operation, reports = [], fields = {}) {
  return createInstallReport({
    ...fields,
    operation,
    ok: reports.every((report) => report?.ok !== false),
    installed: reports.some((report) => report?.installed === true),
    warnings: reports.flatMap((report) => report?.warnings ?? []),
    errors: reports.flatMap((report) => report?.errors ?? []),
    meta: { reports }
  });
}
