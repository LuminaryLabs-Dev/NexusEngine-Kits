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

## Rule

The installer attaches kits to an engine. It does not own kit behavior.

Default installation accepts only official manifests. Use `allowStatuses` explicitly for candidate review; placeholders and scaffolds never masquerade as working behavior.
