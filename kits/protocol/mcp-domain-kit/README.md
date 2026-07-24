# MCP Domain Kit

`mcp-domain-kit` is an optional protocol Domain Service Kit. Installing it adds
`engine.n.mcp`; applications that do not install it receive no MCP runtime
surface.

The kit accepts explicit provider descriptors containing tools, resources, and
prompts. It never scans `engine.n`, imports every installed kit, or publishes
application capabilities automatically.

```js
import { createRealtimeGame } from "nexusengine";
import {
  createMcpDomainKit,
  defineMcpProvider
} from "@luminarylabs/nexusengine-kits/mcp-domain-kit";

const provider = defineMcpProvider({
  id: "example-provider",
  tools: [{
    name: "world_status",
    description: "Read the current world status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: (_args, { engine }) => ({ status: engine.status ?? "ready" })
  }]
});

const engine = createRealtimeGame({
  kits: [createMcpDomainKit({ providers: [provider] })]
});
```

Node applications can connect the resulting registry to the stable official
MCP SDK through `@luminarylabs/nexusengine-kits/mcp/node`. Transport selection
stays outside the domain kit.
