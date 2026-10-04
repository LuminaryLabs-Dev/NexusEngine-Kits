import { createEngine } from "nexusengine";
import { createDataKit } from "nexusengine/domains/runtime/data";
import { createObservationHistoryKit } from "nexusengine/domains/runtime/data/observation";
import { createSimulationKit } from "nexusengine/domains/simulation/runtime";
import { createSpatialKit } from "nexusengine/domains/spatial/contracts";
import { createObservedGameStateAdapterKit } from "../../simulation/observed-game-state-adapter-kit/index.js";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeWorkerPacket, createWorkerPacketDecoder } from "../../host/native-emulator-worker-kit/index.js";
import { extractMemorySegments } from "../emulator-memory-observer-kit/index.js";
import { loadNintendoContent } from "../../asset/nintendo-content-loader-kit/index.js";
import { decodeGameProfile } from "../../simulation/observed-game-state-adapter-kit/index.js";
import { encodeConsoleInput } from "../../input/console-input-adapter-kit/index.js";
import { writeSnapshotBundle, readSnapshotBundle } from "../../persistence/filesystem-snapshot-adapter-kit/index.js";
import { rasterToRgba } from "../../presentation/raster-frame-provider-kit/index.js";
import { createPcmPlayback } from "../../presentation/pcm-audio-provider-kit/index.js";
import { evaluateMemoryOracle, runRomCase } from "../../diagnostics/rom-test-runner-kit/index.js";
import { createLibretroProviderKit } from "../libretro-provider-kit/index.js";
export async function runAdapterProof(id = "all") {
  const packets = [], decoder = createWorkerPacketDecoder(packet => packets.push(packet));
  const encoded = encodeWorkerPacket({ requestId: 1, protocolVersion: 1 }, Buffer.from([1,2,3]));
  for (const byte of encoded) decoder(Buffer.from([byte]));
  assert.deepEqual([...packets[0].binary], [1,2,3]);
  assert.throws(() => createWorkerPacketDecoder(() => {})(Buffer.from([255,255,255,255])));
  const segments = extractMemorySegments({ binary: Buffer.from([1,2,3]), result: { segments: [{ id: "ram", offset: 0, length: 3 }] } });
  assert.throws(() => extractMemorySegments({ binary: Buffer.alloc(1), result: { segments: [{ id: "x", offset: 0, length: 2 }] } }));
  const profile = { schema: "nexusretro.game-profile/1", contentHashes: ["sha256:" + "a".repeat(64)], memoryRanges: [{id:"ram",space:"cpu",address:0,length:3}], fields: [{ id: "health", segment: "ram", offset: 0, width: 1, min: 0, max: 10, destination: { kind: "meter" } }] };
  assert.equal(decodeGameProfile(profile, segments, "sha256:" + "a".repeat(64))[0].value, 1);
  assert.throws(() => decodeGameProfile(profile, segments, "wrong"));
  assert.deepEqual(encodeConsoleInput(["a", "right"]), [384]); assert.throws(() => encodeConsoleInput(["invalid"]));
  assert.deepEqual([...rasterToRgba({ width: 1, height: 1, pitch: 4, format: 1 }, Uint8Array.from([0,0,255,0]))], [255,0,0,255]);
  assert.deepEqual([...rasterToRgba({ width: 1, height: 1, pitch: 2, format: 2 }, Uint8Array.from([0,248]))], [255,0,0,255]);
  assert.throws(() => rasterToRgba({ width: 1, height: 1, pitch: 0, format: 2 }, new Uint8Array()));
  let started = 0, stopped = 0;
  const playback = createPcmPlayback({ currentTime: 0, destination: {}, createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) }), createBufferSource: () => ({ connect() {}, start() { started++; }, stop() { stopped++; } }) });
  playback.enqueue(Uint8Array.from([0,0,0,0]), 48000); playback.reset(); assert.equal(started, 1); assert.equal(stopped, 1);
  const buffers=[];
  const highRate=createPcmPlayback({ currentTime:0,sampleRate:48000,destination:{},createBuffer:(_,length,rate)=>{const data=[new Float32Array(length),new Float32Array(length)];buffers.push({data,length,rate});return{getChannelData:c=>data[c]};},createBufferSource:()=>({connect(){},start(){},stop(){}}) });
  const pcm=Buffer.alloc(4000);for(let i=0;i<1000;i++){pcm.writeInt16LE(16384,i*4);pcm.writeInt16LE(-16384,i*4+2);}
  highRate.enqueue(pcm,2097152);highRate.enqueue(pcm,2097152);
  assert.equal(buffers.reduce((n,b)=>n+b.length,0),Math.floor(2000*48000/2097152));
  assert(buffers.every(b=>b.rate===48000 && [...b.data[0]].every(x=>Math.abs(x-.5)<1e-6) && [...b.data[1]].every(x=>Math.abs(x+.5)<1e-6)));highRate.dispose();
  assert.equal(evaluateMemoryOracle(Uint8Array.from([1,1,1])).status, "PASS"); assert.equal(evaluateMemoryOracle(Uint8Array.from([0,1,255])).status, "FAIL");
  const temporary = await mkdtemp(join(tmpdir(), "retro-kit-"));
  try {
    const rom = join(temporary, "test.gb"); await writeFile(rom, Buffer.alloc(32768)); assert.equal((await loadNintendoContent(rom)).system, "gb");
    await writeFile(join(temporary, "broken.gb"), Buffer.alloc(10)); await assert.rejects(loadNintendoContent(join(temporary, "broken.gb")));
    const save = join(temporary, "state.save"); await writeSnapshotBundle(save, { binary: Buffer.from([1,2,3]), metadata: { sourceFrame: 1 } }); assert.deepEqual([...(await readSnapshotBundle(save)).binary], [1,2,3]);
    await writeFile(save, Buffer.alloc(5)); await assert.rejects(readSnapshotBundle(save));
  } finally { await rm(temporary, { recursive: true, force: true }); }
  const verdict = await runRomCase({ session: { sourceFrame: 0, async load() {}, async step() { return { sourceFrame: 1, segments: new Map([["oracle", Uint8Array.from([0,0,0])]]) }; } }, path: "fixture", profile: {}, maxFrames: 2 });
  assert.equal(verdict.status, "TIMEOUT"); assert.equal(createLibretroProviderKit().id, "libretro-provider-kit");
  const shared=createObservedGameStateAdapterKit(),make=()=>createEngine({kits:[createDataKit(),createObservationHistoryKit(),createSimulationKit({resolution:true}),createSpatialKit(),shared]}), first=make(),second=make();
  for(const [engine,sessionId] of [[first,"first"],[second,"second"]])engine.n.observedGameState.stage({id:sessionId+":1:1",sessionId,epoch:1,sourceFrame:1,inputPacket:[0],decoded:[]});
  for(const engine of [first,second]){engine.tick();engine.n.observedGameState.finish();assert.equal(engine.n.observationHistory.list().length,1);engine.n.observedGameState.dispose();}
  console.log(`${id}: adapter boundary proofs PASS`);
}
if (process.argv[1]?.endsWith("adapter-proof.mjs")) await runAdapterProof();
