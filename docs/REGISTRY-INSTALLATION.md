# Registry Installation

## Source template

`nexusengine.registry.json` is generated from `manifests/`. Its `resolvedCommit` is `null` because a Git commit cannot contain its own hash. A metadata transport must fetch the file from a resolved revision, inject that exact 40-character SHA, materialize immutable module URLs, and validate the result before installation.

## Trusted registries

Trusted owner defaults are:

- `LuminaryLabs-Dev`
- `LuminaryLabs-Agents`
- `LuminaryLabs-Publish`

Trust never bypasses schema, immutable commit, integrity, collision, dependency, or status checks.

```js
const registry = await pullRegistry("LuminaryLabs-Dev/NexusEngine-Kits");
```

## External registries

External metadata requires an exact approved pin:

```js
const registry = await pullRegistry("ThirdParty/Example-Kits", {
  externalRegistries: {
    "ThirdParty/Example-Kits": "<40-character-sha>"
  }
});
```

Metadata pull never imports module fields. Executing external code is a separate opt-in requiring `allowExternalCode: true`, a verified manifest hash, and an approved Node or browser module resolver.

## Lockfile

```js
const plan = createInstallPlan({ bundles: ["registry-control-plane"] }, { registry });
const lockfile = createNexusEngineKitsLockfile({
  registries: [registry],
  selection: { bundles: ["registry-control-plane"] },
  plan
});
```

`nexusengine-kits.lock.json` records registry commits, selected kits, deterministic install order, core dependencies, module URLs, versions, and integrity hashes. `createInstallPlanFromLockfile()` validates offline reuse without pulling metadata.
