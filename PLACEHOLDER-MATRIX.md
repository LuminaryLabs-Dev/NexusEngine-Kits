# Placeholder Matrix

This matrix makes placeholder status explicit. It should be regenerated with `npm run generate:placeholder-matrix` after major catalog changes.

| Domain | Kit | Cataloged | Physical folder | Real behavior | Docs | Smoke | Status | Next action |
|---|---|---:|---:|---:|---:|---:|---|---|
| spatial | completion-ledger-kit | yes | yes | yes | yes | yes | candidate | full ProtoKits parity and domain official review |
| spatial | spatial-index-kit | yes | no | no | no | no | migration-placeholder | rebuild or document as planned |
| spatial | interactable-registry-kit | yes | no | no | no | no | migration-placeholder | rebuild or document as planned |
| spatial | spatial-interaction-kit | yes | yes | no | partial | no | migration-placeholder | rebuild next |
| spatial | hold-action-kit | yes | no | no | no | no | migration-placeholder | rebuild or document as planned |
| progression | objective-bridge-kit | yes | yes | no | partial | no | migration-placeholder | rebuild after spatial-interaction-kit |
| progression | lock-group-kit | yes | yes | no | partial | no | migration-placeholder | rebuild after objective bridge |
| hazard-combat | damage-health-kit | yes | yes | no | partial | no | migration-placeholder | rebuild first combat kit |
| economy-resources | resource-node-kit | yes | yes | no | partial | no | migration-placeholder | rebuild first resource kit |
| building | build-placement-kit | yes | yes | no | partial | no | migration-placeholder | rebuild first building kit |
| building | structure-runtime-kit | yes | yes | no | partial | no | migration-placeholder | rebuild after placement |
| render-descriptors | asset-descriptor-kit | yes | yes | no | partial | no | migration-placeholder | rebuild first descriptor kit |
| camera-feedback | diegetic-feedback-signal-kit | yes | yes | no | partial | no | migration-placeholder | rebuild first feedback kit |

## Rule

A placeholder is allowed only when it is clearly marked and does not claim real behavior.
