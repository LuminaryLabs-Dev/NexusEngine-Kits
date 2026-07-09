# completion-ledger-kit Limitations

## Current status

```txt
status: candidate
real behavior: yes
placeholder: no
smoke: yes
parity: partial
```

## What works

- complete
- has
- count
- reset
- snapshot
- loadSnapshot
- installer route
- spatial domain smoke path

## What does not work yet

- full ProtoKits parity comparison
- event emission integration beyond event naming
- official domain-level status
- persistence contract beyond snapshot/loadSnapshot

## Known failure modes

- Apps may assume official status because behavior exists.
- Event names exist but no event bus integration is official yet.

## Required before official

- complete ProtoKits parity review
- add event integration or document no-event runtime contract
- domain smoke including the next rebuilt spatial kit
- release-tagged CDN validation
