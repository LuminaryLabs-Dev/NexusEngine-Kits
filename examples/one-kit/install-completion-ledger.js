import { createNexusEngineKitInstaller } from "../../installer/index.js";

export async function installCompletionLedgerExample(engine) {
  const installer = createNexusEngineKitInstaller();
  return installer.installKit(engine, "completion-ledger-kit");
}
