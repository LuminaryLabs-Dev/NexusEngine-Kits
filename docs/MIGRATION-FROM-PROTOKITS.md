# Migration From ProtoKits

This repo receives stable kits from `LuminaryLabs-Agents/NexusEngine-ProtoKits`.

## Migration Ladder

```txt
Experiment
-> ProtoKit
-> validated ProtoKit
-> NexusEngine-Kits official kit
-> NexusEngine runtime primitive only if the runtime contract must change
```

## What Moves First

Start with atomic services:

```txt
completion-ledger-kit
spatial-interaction-kit
objective-bridge-kit
lock-group-kit
damage-health-kit
resource-node-kit
build-placement-kit
structure-runtime-kit
asset-descriptor-kit
diegetic-feedback-signal-kit
```

Then migrate domain families:

```txt
input
spatial
progression
hazard-combat
camera-feedback
render-descriptors
```

Then migrate large families:

```txt
aerial
rpg-social
rpg-combat
spatial-authoring
generic-defense
route-extraction
project-deployment
```

## Promotion Checklist

A kit can move here when it is:

- generic beyond one game
- named by domain
- deterministic where state matters
- renderer-agnostic by default
- headless-testable
- documented
- individually installable
- domain-bundle installable
- CDN-addressable

## Compatibility

Do not immediately delete ProtoKit paths. ProtoKits should eventually re-export or document replacements:

```txt
Old: @luminarylabs/nexusengine-protokits/damage-health-kit
New: @luminarylabs/nexusengine-kits/damage-health-kit
```
