import { adapterKit } from "../../emulation/kit-factory.js";
import { observationDigest } from "nexusengine/domains/runtime/data/observation";
export function validateGameProfile(profile) {
  if (profile?.schema !== "nexusretro.game-profile/1" || !Array.isArray(profile.contentHashes) || !profile.contentHashes.length || !profile.contentHashes.every(hash => /^sha256:[a-f0-9]{64}$/.test(hash)) || !Array.isArray(profile.memoryRanges) || !Array.isArray(profile.fields)) throw new TypeError("Invalid game profile identity or collections.");
  const ranges = new Map();
  for (const range of profile.memoryRanges) {
    if (!range.id || ranges.has(range.id) || !["cpu","system","save"].includes(range.space) || !Number.isSafeInteger(range.address) || range.address < 0 || !Number.isSafeInteger(range.length) || range.length < 1 || range.length > 1024*1024) throw new TypeError("Invalid or duplicate profile memory range.");
    ranges.set(range.id, range);
  }
  const ids = new Set();
  for (const field of profile.fields) {
    const range = ranges.get(field.segment), target=field.destination;
    if (!field.id || ids.has(field.id) || !range || ![1,2,4].includes(field.width) || !Number.isSafeInteger(field.offset) || field.offset < 0 || field.offset+field.width>range.length || !["little","big"].includes(field.endian??"little") || !Number.isFinite(field.scale??1) || (field.scale??1)===0 || !["meter","spatial","descriptor"].includes(target?.kind)) throw new TypeError("Invalid or duplicate profile field.");
    if(target.kind==="meter" && (!Number.isFinite(field.min)||!Number.isFinite(field.max)||field.max<field.min))throw new TypeError("Meter requires ordered bounds.");
    if(target.kind==="spatial" && (!target.units||!target.space))throw new TypeError("Spatial field requires units and space.");
    if(target.kind==="descriptor" && !["diagnostics","data","spatial","simulation","input"].includes(target.domain))throw new TypeError("Unknown descriptor owner.");
    ids.add(field.id);
  }
  return profile;
}
export function decodeGameProfile(profile, segments, contentHash) {
  if (!profile || profile.schema !== "nexusretro.game-profile/1" || !Array.isArray(profile.contentHashes) || !profile.contentHashes.includes(contentHash)) throw new Error("Profile does not support this content identity.");
  validateGameProfile(profile);
  const decoded = [];
  for (const field of profile.fields ?? []) {
    const data = segments.get(field.segment);
    if (!data || ![1, 2, 4].includes(field.width) || !Number.isSafeInteger(field.offset) || field.offset < 0 || field.offset + field.width > data.length || !["little", "big"].includes(field.endian ?? "little")) throw new Error(`Invalid profile field: ${field.id}.`);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength), little = field.endian !== "big";
    const method = `get${field.signed ? "Int" : "Uint"}${field.width * 8}`;
    const value = view[method](field.offset, little) / (field.scale ?? 1);
    if (!Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) throw new Error(`Decoded field outside verified bounds: ${field.id}.`);
    if (!["meter", "spatial", "descriptor"].includes(field.destination?.kind)) throw new Error("Unsupported semantic destination.");
    decoded.push({ field, value });
  }
  return decoded;
}
export function createObservedGameStateAdapterKit() {
  return adapterKit({ id: "observed-game-state-adapter-kit", domain: "observed-game-state-adapter", domainPath: "n:simulation:extensions:observed-game-state", parentDomainPath: "n:simulation:extensions", apiName: "observedGameState", requires: ["simulation:resolution", "data:observation-history", "n:spatial"], provides: ["emulation:semantic-observation"], createApi({ engine }) {
    let inbox = null, consumed = null;
    const domains = () => Object.fromEntries(Object.entries({ data: engine.n.data?.getSnapshot(), input: engine.n.input?.getSnapshot(), simulation: engine.n.simulation.getSnapshot(), spatial: engine.n.spatial.getSnapshot(), character: engine.n.character?.getSnapshot(), player: engine.n.player?.getSnapshot(), diagnostics: engine.n.diagnostics?.getSnapshot() }).filter(([, value]) => value !== undefined));
    const participant = {
      id: "observed-game-state-adapter",
      prepare({ observations }) {
        if (!inbox) return null;
        const receipt = inbox;
        if (!observations.some(entry => entry.id === receipt.id)) throw new Error("Missing emulator observation.");
        const latest = engine.n.observationHistory.list({ limit: 600 }).findLast(record => record.sessionId === receipt.sessionId);
        if (latest && (receipt.epoch < latest.epoch || (receipt.epoch === latest.epoch && receipt.sourceFrame <= latest.sourceFrame))) throw new Error("Stale emulator receipt.");
        return { receipt, before: domains(), history: engine.n.observationHistory.getSnapshot() };
      },
      apply(prepared) {
        if (!prepared) return;
        engine.n.input?.setDescriptor("packets", "console", { buttons: prepared.receipt.inputPacket });
        for (const { field, value } of prepared.receipt.decoded) {
          const target = field.destination;
          if (target.kind === "meter") {
            if (!Number.isFinite(field.min) || !Number.isFinite(field.max)) throw new Error("Meter mapping requires explicit bounds.");
            if (!engine.n.simulation.resources.get(field.id)) engine.n.simulation.resources.register({ id: field.id, min: field.min, max: field.max, value, ratePerSecond: 0 });
            engine.n.simulation.resources.set(field.id, value, "external-observation");
          } else if (target.kind === "spatial") {
            if (!target.units || !target.space) throw new Error("Spatial mapping requires units and space.");
            engine.n.spatial.setDescriptor("observations", field.id, { value, units: target.units, space: target.space });
          } else {
            const api = engine.n[target.domain];
            if (!["diagnostics", "data", "spatial", "simulation", "input"].includes(target.domain) || !api?.setDescriptor) throw new Error("Profile destination has no public descriptor owner.");
            api.setDescriptor(target.type ?? "observations", field.id, { value });
          }
        }
      },
      afterCommit(prepared) {
        if (!prepared) return;
        const { decoded, ...portable } = prepared.receipt;
        engine.n.observationHistory.appendCommitted({ ...portable, committed: true, domains: domains() });
        consumed = portable.id;
      },
      rollback(prepared) {
        if (!prepared) return;
        engine.n.simulation.loadSnapshot(prepared.before.simulation); engine.n.spatial.loadSnapshot(prepared.before.spatial);
        for (const key of ["diagnostics", "data", "input"]) if (prepared.before[key]) engine.n[key].loadSnapshot(prepared.before[key]);
        engine.n.observationHistory.loadSnapshot(prepared.history); consumed = null;
      }
    };
    engine.n.simulation.registerCommitParticipant(participant);
    engine.n.simulation.registerObservationSource({ id: "emulator", observe: () => inbox ? [{ id: inbox.id, source: "emulator", value: { sessionId: inbox.sessionId, epoch: inbox.epoch, sourceFrame: inbox.sourceFrame } }] : [] });
    return {
      stage(receipt) { if (inbox) throw new Error("Observation inbox is occupied."); inbox = receipt; consumed = null; },
      finish() { if (inbox && consumed !== inbox.id) throw new Error("Emulator frame did not commit."); inbox = null; consumed = null; },
      abort() { inbox = null; consumed = null; },
      digest: observationDigest,
      dispose() { engine.n.simulation.unregisterCommitParticipant(participant.id); engine.n.simulation.unregisterObservationSource("emulator"); inbox = null; }
    };
  } });
}
