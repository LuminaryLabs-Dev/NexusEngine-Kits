import { createMultiplayerHostKit } from "../../kits/network/multiplayer-host-kit/index.js";
export function createNetworkDomainKits(config = {}) { return [createMultiplayerHostKit(config.multiplayerHost)]; }
export const networkDomain = Object.freeze({ id: "network", domainPath: "n:network:extensions", kits: ["multiplayer-host-kit", "peerjs-transport-provider-kit"] });
