import { adapterKit } from "../kit-factory.js";
export function createLibretroProviderKit() {
  return adapterKit({ id: "libretro-provider-kit", domain: "libretro-provider", domainPath: "n:host:extensions:libretro", parentDomainPath: "n:host:extensions", apiName: "emulatorProvider", requires: ["emulation:worker"], provides: ["emulation:frame-step", "emulation:serialize"], createApi({ engine }) {
    const client = engine.n.emulatorWorker.client;
    return {
      start: () => client.start(),
      loadContent: (payload, identity) => client.request("loadContent", payload, identity),
      step: (payload, identity) => client.request("step", payload, identity),
      reset: identity => client.request("reset", {}, identity),
      serialize: identity => client.request("serialize", {}, identity),
      unserialize: (payload, identity) => client.request("unserialize", payload, identity),
      close: () => client.close(), dispose: () => client.dispose(),
      getIdentity: () => structuredClone(client.identity)
    };
  } });
}
