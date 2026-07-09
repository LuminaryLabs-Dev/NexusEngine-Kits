import assert from "node:assert/strict";
import { createAudit, writeText } from "./audit-utils.mjs";
import { createCompletionLedgerKit } from "../kits/spatial/completion-ledger-kit/index.js";
import { createNexusEngineKitInstaller } from "../installer/index.js";

const audit = createAudit("Completion Ledger Behavior Audit");

try {
  const engine = { kits: [], n: {}, tickCount: 42, installKit(kit) { this.kits.push(kit); kit.initWorld?.({ engine: this, world: {}, kit }); return kit; } };
  const installer = createNexusEngineKitInstaller();
  const report = await installer.installKit(engine, "completion-ledger-kit");
  assert.equal(report.installed, true);
  assert.equal(engine.kits[0].metadata.realBehavior, true);
  assert.equal(engine.n.completionLedger.complete("alpha").ok, true);
  assert.equal(engine.n.completionLedger.has("alpha"), true);
  assert.equal(engine.n.completionLedger.complete("alpha").ok, false);
  assert.equal(engine.n.completionLedger.complete("coin", { repeatable: true }).ok, true);
  assert.equal(engine.n.completionLedger.complete("coin").ok, true);
  assert.equal(engine.n.completionLedger.count("coin"), 2);
  const snapshot = engine.n.completionLedger.snapshot();
  assert.equal(snapshot.records.length, 2);
  engine.n.completionLedger.reset("alpha");
  assert.equal(engine.n.completionLedger.has("alpha"), false);
  engine.n.completionLedger.loadSnapshot(snapshot);
  assert.equal(engine.n.completionLedger.has("alpha"), true);

  const direct = createCompletionLedgerKit();
  direct.initWorld({ engine: { n: {}, nexusEngineKitInstallReports: [] }, world: {} });
  assert.equal(typeof direct.snapshot, "function");
} catch (error) {
  audit.error(error?.message ?? String(error));
}

writeText("audit/reports/completion-ledger-behavior-report.md", `# Completion Ledger Behavior Report\n\nValidated behaviors:\n\n- installer installs real kit\n- completion works\n- duplicate one-time completion rejects\n- repeatable completions count\n- snapshot and reset work\n- loadSnapshot restores state\n\nStatus: ${audit.ok() ? "passing" : "failing"}\n`);

audit.finish("completion-ledger-behavior-report");
