# Installer API

The installer API resolves and installs kits, domains, bundles, and the full catalog.

## Exports

- `createNexusEngineKitInstaller`
- `installKit`
- `installDomain`
- `installBundle`
- `installAll`
- `resolveKit`
- `resolveDomain`
- `resolveCdn`
- `validateKitManifest`
- `validateDomainManifest`
- `validateInstallPlan`
- `createInstallReport`
- `getKitProgress`
- `pullRegistry`
- `mergeRegistries`
- `createCapabilityGraph`
- `createInstallPlan`
- `createNexusEngineKitsLockfile`
- `createInstallPlanFromLockfile`

## Rule

The installer attaches kits to an engine. It does not own kit behavior.

Default installation accepts only official manifests. Use `allowStatuses` explicitly for candidate review; placeholders and scaffolds never masquerade as working behavior.

All selections are planned before execution. Missing dependencies, dependency cycles, direct unready selections, duplicate registry IDs, API collisions, and domain-path collisions prevent installation. Domain and bundle members that are merely unready are returned as skipped records while official siblings remain installable.
