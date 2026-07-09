# Install Report Guide

Install reports describe what the installer did.

## Fields

```txt
ok
operation
kitId
domainId
bundleId
installed
duplicate
warnings
errors
meta
```

## Usage

A successful kit install should report `ok: true`, the operation name, and whether a kit was newly installed or skipped as a duplicate.

Domain and bundle reports should include child reports in `meta.reports`.
