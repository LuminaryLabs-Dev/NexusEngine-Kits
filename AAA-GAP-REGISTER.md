# AAA Gap Register

NexusRealtime Kits is not currently a full AAA game stack.

## Runtime gaps

- No full production install lockfile.
- No remote catalog pinning policy.
- No rollback or recovery for failed installs.

## Kit behavior gaps

- Most kits are metadata placeholders.
- Only `completion-ledger-kit` has candidate real behavior.
- First-wave gameplay and descriptor kits are not rebuilt yet.

## Domain gaps

- Domains are installable, but most members are placeholders.
- Only the spatial domain has a smoke path around one real candidate kit.

## Asset and rendering gaps

- Render descriptor kits are scaffolded.
- Renderer adapters are not production-ready.
- No asset streaming or material pipeline is official.

## Save, load, and replay gaps

- `completion-ledger-kit` supports snapshot and loadSnapshot.
- Broader save/load contracts are not official.

## Networking gaps

- No official replication, authority, session, or transport kit exists yet.

## Tooling gaps

- No editor or KitBuilder integration is official.
- No package release automation is complete.

## Testing gaps

- Audit and smoke scripts exist.
- Most kits still need real behavior tests.

## Release gaps

- No stable tag is declared as production-ready.
- npm publication has not been completed.
