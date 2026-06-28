import { createNexusRealtimeKitInstaller } from "./kit-installer.js";

export async function installBundleKits(engine, bundleId, config = {}, options = {}) {
  const kitInstaller = createNexusRealtimeKitInstaller(options);
  return kitInstaller.installBundle(engine, bundleId, config);
}

export { installBundleKits as installBundle };
