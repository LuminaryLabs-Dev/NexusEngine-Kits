# AGENTS.md

This file defines how agents work inside NexusRealtime Kits.

NexusRealtime Kits is the official first-party plugin catalog. It receives stable, reusable capabilities from `NexusRealtime-ProtoKits` and publishes them as individually installable, domain-installable, bundle-installable, CDN-addressable kits.

## Prime Directive

Do not treat this repo as a pile of plugins.

Treat it as a curated kit catalog.

```txt
Find the domain.
Find the kit.
Check the ProtoKit source.
Promote only stable behavior.
Keep each kit individually installable.
Keep each domain bundle installable.
Keep CDN paths stable.
Validate before marking official.
```

## Repo Boundaries

Do not change `LuminaryLabs-Dev/NexusRealtime` from this repo's work.

Use this split:

```txt
NexusRealtime
  runtime rail and contracts

NexusRealtime-Kits
  official first-party kit catalog

NexusRealtime-ProtoKits
  incubation and experiments
```

## Promotion Rules

A ProtoKit can move here only when it has:

- a clear domain
- stable kit name
- reusable behavior
- deterministic state where relevant
- renderer-agnostic runtime behavior
- README or domain docs
- install example
- promotion rationale

If a kit is not stable, document it in the migration plan but leave it in ProtoKits.

## Required Kit Shape

Each official kit should eventually have:

```txt
kits/<domain>/<kit-name>/
├─ README.md
├─ kit.json
├─ package.json
├─ index.js
├─ smoke.test.mjs
└─ examples/
   ├─ headless.js
   └─ browser-cdn.html
```

The bootstrap catalog may contain metadata-only placeholder entries. A placeholder is not a full behavior migration. It is a stable landing zone and install path.

## Installer Rules

The installer may resolve and install:

- one kit by ID
- one domain by ID
- one bundle by ID
- all catalog kits
- a direct runtime kit object

The installer must not own gameplay behavior. It resolves, creates, validates, and installs kits into a NexusRealtime engine.

## Naming Grammar

Use:

```txt
<domain>/<kit-name>-kit
<domain>/<capability>-adapter
<domain>/<theme>-preset
```

Avoid:

```txt
utils
helpers
misc
core
common
random feature blobs
```

## Completion Checklist

Before reporting completion, say:

- which repo changed
- which branch changed
- which kits/domains changed
- whether entries are placeholders or full behavior migrations
- what validation ran
- whether NexusRealtime runtime repo was left untouched
