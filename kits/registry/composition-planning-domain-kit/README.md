# composition-planning-domain-kit

Native NexusEngine composition planner at `n:registry:composition` and `engine.n.compositionPlanning`.

Status: official. Stable source: `LuminaryLabs-Agents/NexusEngine-ProtoKits@e4e8a1e03943d1fb7ab1bfddb8837ad16b919c29`.

## Owns

- Serializable recipes selecting kits, domains, and bundles.
- Expansion of domain/bundle metadata through the registry contract.
- Dependency provider inclusion through the capability graph.
- Deterministic install plans, allowed-status gates, missing reports, cycle reports, validation, and readiness scoring.
- Reset, snapshot, and exact restore.

## Does not own

Registry fetch, Git/GitHub resolution, module import, code execution, kit installation, filesystem writes, renderer state, or child domain behavior.

## API

```text
registerRecipe, planComposition, createInstallPlan
validateComposition, suggestMissingDomains, scoreComposition
getState, getSnapshot, loadSnapshot, reset
```

`engine.compositionPlanning` remains as a compatibility alias. New composition uses `engine.n.compositionPlanning`.

The real NexusEngine control-plane test proves kit/domain/bundle expansion, candidate opt-in, dependency ordering, missing/cycle rejection, and snapshot behavior.
