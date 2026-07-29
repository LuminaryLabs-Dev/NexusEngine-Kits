# Goal

**Status:** active

Maintain the trusted first-party package for reusable non-Core NexusEngine
behavior.

## Success Criteria

- Every implementation is reusable but correctly excluded from Core.
- Every manifest identity has one owner and one public destination.
- Kits use only public NexusEngine package entrypoints.
- Registry metadata fails closed until a trusted provider verifies executable
  code.
- Placeholders never masquerade as behavior.
- Complete games and authored presets remain outside this package.
- No active workflow creates or updates ProtoKits.
- Generated catalogs, exports, installer tables, docs, and proof agree.

## Current State

```txt
baseline resolved: 7 / 120
baseline remaining: 113
approved additions resolved: 21 / 29
official: 26
deprecated compatibility: 2
inventoried: 149
active capability: clock-kit
```

Run `npm run progress` before reporting counts because this file records only a
dated working state.
