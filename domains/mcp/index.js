import { createMcpDomainKit } from "../../kits/protocol/mcp-domain-kit/index.js";

export function createMcpDomainKits(config = {}) {
  return [createMcpDomainKit(config.mcp ?? config)];
}

export default createMcpDomainKits;
