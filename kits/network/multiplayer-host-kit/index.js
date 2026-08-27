import { defineDomainServiceKit } from "nexusengine";
import { createMultiplayerHostController } from "./controller.js";

export { createMultiplayerHostController } from "./controller.js";

export function createMultiplayerHostKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "multiplayer-host-kit",
    domain: "network-multiplayer-host",
    domainPath: "n:network:extensions:multiplayer-host",
    parentDomainPath: "n:network:extensions",
    apiName: "multiplayer",
    version: "0.1.1",
    stability: "candidate",
    requires: [],
    provides: ["network:multiplayer-host", "network:prediction", "network:reconciliation", "network:session-handshake"],
    services: ["multiplayer"],
    metadata: { portable: true, deterministic: true },
    createApi() {
      return config.provider && config.simulation ? createMultiplayerHostController(config) : { createController: createMultiplayerHostController };
    }
  });
}
