# Installer API

The installer API resolves and installs kits, domains, bundles, and the full catalog.

## Exports

- `createNexusRealtimeKitInstaller`
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

## Rule

The installer attaches kits to an engine. It does not own kit behavior.
