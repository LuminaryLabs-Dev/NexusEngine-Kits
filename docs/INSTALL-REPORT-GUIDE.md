# Install Report Guide

Planning happens before code execution. Every selection report exposes:

```text
ok
registryId, resolvedCommit
selection, plan
resolvedSources
installed, skipped
warnings, errors
coreDependencies
```

`resolvedSources` records repository identity, commit, module path, and integrity. `skipped` contains unready domain/bundle members or duplicate installed kits. Direct unready selections, missing providers, cycles, lock mismatches, integrity failures, and code-execution failures appear in `errors` and set `ok: false`.
