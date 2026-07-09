# Workflow

Status: active

```text
pull -> orient -> inspect source lineage -> map domain owners -> compare feature union
     -> implement candidate -> validate -> classify readiness -> push target
     -> record and push LuminaryLabs audit
```

## Rules

- Never reset, rebase, stash, discard, or overwrite existing work automatically.
- Never modify source game or project repositories.
- Do not create catch-all domains or hide cross-domain dependencies.
- Do not reduce useful behavior during merging without explicit approval and replacement parity.
- Keep unproven work in ProtoKits or mark it visibly non-official.
- A target change is incomplete until its LuminaryLabs audit is pushed.
