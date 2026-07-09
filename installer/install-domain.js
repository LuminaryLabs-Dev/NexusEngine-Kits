import { createNexusRealtimeKitInstaller } from "./kit-installer.js";

export async function installDomainKits(engine, domainId, config = {}, options = {}) {
  const kitInstaller = createNexusRealtimeKitInstaller(options);
  return kitInstaller.installDomain(engine, domainId, config);
}

export { installDomainKits as installDomain };
