import { createNexusEngineKitInstaller } from "./kit-installer.js";

export async function installBundleKits(engine, bundleId, config = {}, options = {}) {
  const kitInstaller = createNexusEngineKitInstaller(options);
  return kitInstaller.installBundle(engine, bundleId, config);
}

export { installBundleKits as installBundle };
