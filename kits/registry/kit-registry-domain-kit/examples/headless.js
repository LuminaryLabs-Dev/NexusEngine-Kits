import { createRealtimeGame } from "nexusengine";
import { createKitRegistryDomainKit, createRepositoryRegistry } from "../index.js";

const registry = createRepositoryRegistry({
  owner: "LuminaryLabs-Dev",
  repository: "Example-Kits",
  resolvedCommit: "1234567890abcdef1234567890abcdef12345678",
  kits: [{ id: "example-kit", domain: "example", domainPath: "n:example:kit", apiName: "exampleKit", status: "official" }]
});
const engine = createRealtimeGame({ kits: [createKitRegistryDomainKit({ registries: [registry] })] });
console.log(engine.n.kitRegistry.get("example-kit"));
