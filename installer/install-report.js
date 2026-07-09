export function createInstallReport(fields = {}) {
  return {
    ok: fields.ok ?? true,
    operation: fields.operation ?? "install",
    registryId: fields.registryId ?? null,
    resolvedCommit: fields.resolvedCommit ?? null,
    selection: fields.selection ?? {},
    plan: fields.plan ?? null,
    resolvedSources: fields.resolvedSources ?? [],
    installed: fields.installed ?? [],
    skipped: fields.skipped ?? [],
    warnings: fields.warnings ?? [],
    errors: fields.errors ?? [],
    coreDependencies: fields.coreDependencies ?? [],
    meta: fields.meta ?? {}
  };
}

export function mergeInstallReports(operation, reports = [], fields = {}) {
  return createInstallReport({
    ...fields,
    operation,
    ok: reports.every((report) => report?.ok !== false),
    resolvedSources: reports.flatMap((report) => report?.resolvedSources ?? []),
    installed: reports.flatMap((report) => report?.installed ?? []),
    skipped: reports.flatMap((report) => report?.skipped ?? []),
    warnings: reports.flatMap((report) => report?.warnings ?? []),
    errors: reports.flatMap((report) => report?.errors ?? []),
    coreDependencies: [...new Set(reports.flatMap((report) => report?.coreDependencies ?? []))],
    meta: { reports }
  });
}
