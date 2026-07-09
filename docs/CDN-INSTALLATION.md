# CDN Installation

Production CDN imports must use a full commit SHA. `main` is a discovery channel, not an executable lock.

```js
import { createNexusEngineKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@<40-character-sha>/installer/index.js";
```

Registry manifests expose browser module URL templates containing `{resolvedCommit}`. `pullRegistry()` replaces that token with the commit returned by the metadata transport and rejects mutable HTTP module URLs.

For remote execution, use `createBrowserModuleResolver()`. It fetches module bytes, checks the manifest SHA-256 integrity, and only then imports the immutable URL. Third-party code also requires `allowExternalCode: true`.

The bare `nexusengine` dependency must be supplied through an import map pinned to the exact `engineCompatibility.testedCommit` or another explicitly validated compatible revision.
