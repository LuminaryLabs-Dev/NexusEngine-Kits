# Kit Authoring Guide

A kit is the smallest official installable capability.

Every real kit should eventually include:

```txt
README.md
kit.json
package.json
index.js
source-parity.md
smoke.test.mjs
examples/headless.js
examples/browser-cdn.html
```

## Required Questions

Before adding behavior, answer:

- What domain owns this kit?
- What state does it own?
- What resources does it expose?
- What events does it emit or consume?
- What provides/requires tokens does it use?
- Why is this reusable but not universal Core behavior?
- What public NexusEngine contracts does it use?
- What source or downstream evidence establishes the required behavior?
- What intentional limitations keep its owner atomic?

## Stability

Start as `candidate` unless behavior, ownership, docs, installability, and tests
are proven. Metadata alone is never behavior proof.
