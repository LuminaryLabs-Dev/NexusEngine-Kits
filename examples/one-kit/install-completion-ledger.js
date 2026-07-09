import { createNexusRealtimeKitInstaller } from "../../installer/index.js";

export async function installCompletionLedgerExample(engine) {
  const installer = createNexusRealtimeKitInstaller();
  return installer.installKit(engine, "completion-ledger-kit");
}
