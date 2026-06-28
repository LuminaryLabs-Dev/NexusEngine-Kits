# completion-ledger-kit

Official clean-rebuild kit for completion tracking.

## Purpose

Tracks unique completion, repeatable completion counts, completion tokens, and serializable ledger state without owning UI or game-specific flow.

## Domain

spatial

## Status

```txt
stability: candidate
parity: candidate
behavior: real
```

This kit now provides real runtime behavior. It remains candidate until broader parity review and domain smoke tests are complete.

## Runtime API

When installed, the kit exposes completion ledger methods for complete, has, count, get, reset, snapshot, and loadSnapshot.

## Behavior

- One-time completions reject duplicate completion unless forced.
- Repeatable completions increment a counter.
- Records can store tags and data.
- Snapshots are serializable and sorted by id.
- Reset can clear one record or the whole ledger.

## Install one kit

```js
import { createCompletionLedgerKit } from "@luminarylabs/nexusrealtime-kits/completion-ledger-kit";
```

## CDN

```js
import { createCompletionLedgerKit } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/kits/spatial/completion-ledger-kit/index.js";
```

## Smoke

```bash
node kits/spatial/completion-ledger-kit/smoke.test.mjs
```
