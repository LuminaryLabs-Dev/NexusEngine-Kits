import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { adapterKit } from "../../emulation/kit-factory.js";

export const WORKER_PROTOCOL_VERSION = 1;
const MAX_JSON = 1024 * 1024, MAX_BINARY = 128 * 1024 * 1024;
const commands = new Set(["hello", "loadContent", "step", "reset", "serialize", "unserialize", "close"]);
export function encodeWorkerPacket(message, binary = Buffer.alloc(0)) {
  const data = Buffer.from(binary), header = Buffer.from(JSON.stringify({ ...message, binaryLength: data.length }));
  if (header.length > MAX_JSON || data.length > MAX_BINARY) throw new RangeError("Worker packet budget exceeded.");
  const prefix = Buffer.alloc(4); prefix.writeUInt32LE(header.length);
  return Buffer.concat([prefix, header, data]);
}
export function createWorkerPacketDecoder(onPacket) {
  let buffer = Buffer.alloc(0);
  return chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 4) return;
      const length = buffer.readUInt32LE();
      if (!length || length > MAX_JSON) throw new Error("Invalid worker header length.");
      if (buffer.length < length + 4) return;
      const header = JSON.parse(buffer.subarray(4, length + 4).toString("utf8"));
      const binaryLength = header.binaryLength;
      if (!Number.isSafeInteger(binaryLength) || binaryLength < 0 || binaryLength > MAX_BINARY) throw new Error("Invalid worker binary length.");
      if (buffer.length < 4 + length + binaryLength) return;
      const binary = Buffer.from(buffer.subarray(4 + length, 4 + length + binaryLength));
      buffer = buffer.subarray(4 + length + binaryLength);
      onPacket({ ...header, binary });
    }
  };
}
export class NativeEmulatorWorkerClient {
  constructor(config) { this.config = { timeoutMs: 20000, ...config }; this.pending = new Map(); this.nextId = 1; this.tail = Promise.resolve(); this.child = null; this.disposed = false; this.identity = null; this.logs = ""; }
  start() { this.startPromise ??= this.startWorker(); return this.startPromise; }
  async startWorker() {
    if (this.disposed) throw new Error("Worker disposed.");
    if (this.child) return this.identity;
    const coreBytes = await readFile(this.config.corePath);
    const coreHash = `sha256:${createHash("sha256").update(coreBytes).digest("hex")}`;
    if (this.config.expectedCoreHash && coreHash !== this.config.expectedCoreHash) throw new Error("Core integrity mismatch.");
    const child = spawn(resolve(this.config.executable), [], { stdio: ["pipe", "pipe", "pipe"], shell: false }); this.child = child;
    const rejectAll = error => { for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); } this.pending.clear(); };
    const decode = createWorkerPacketDecoder(response => {
      const pending = this.pending.get(response.requestId);
      if (!pending) { this.disposed = true; child.kill(); rejectAll(new Error("Unexpected worker response.")); return; }
      this.pending.delete(response.requestId); clearTimeout(pending.timer);
      if (response.protocolVersion !== 1 || response.sessionId !== pending.sessionId || response.epoch !== pending.epoch) pending.reject(new Error("Stale or incompatible worker response."));
      else if (response.ok !== true) pending.reject(new Error(response.error ?? "Worker operation failed."));
      else pending.resolve(response);
    });
    child.stdout.on("data", chunk => { try { decode(chunk); } catch (error) { this.disposed = true; child.kill(); rejectAll(error); } });
    child.stderr.on("data", chunk => { this.logs = (this.logs + chunk.toString()).slice(-65536); this.config.onLog?.(chunk.toString()); });
    child.on("error", error => { this.disposed = true; rejectAll(error); }); child.on("exit", (code, signal) => { this.child = null; this.disposed = true; rejectAll(new Error(`Worker exited (${code ?? signal}).`)); });
    child.stdin.on("error", error => { this.disposed = true; rejectAll(error); });
    try {
      const response = await this.request("hello", { corePath: resolve(this.config.corePath), options: this.config.options ?? {}, systemDirectory: this.config.systemDirectory ?? process.cwd() });
      if (response.result.protocolVersion !== 1) throw new Error("Unsupported worker protocol.");
      this.identity = { ...response.result, coreHash }; return this.identity;
    } catch (error) { this.dispose(); throw error; }
  }
  request(command, payload = {}, { sessionId = "", epoch = 0, binary = Buffer.alloc(0) } = {}) {
    if (!commands.has(command) || !Number.isSafeInteger(epoch) || epoch < 0) return Promise.reject(new TypeError("Invalid worker command/epoch."));
    const run = () => new Promise((resolveResult, reject) => {
      if (!this.child || this.disposed) { reject(new Error("Worker is not running.")); return; }
      const requestId = this.nextId++;
      let packet; try { packet = encodeWorkerPacket({ protocolVersion: 1, requestId, sessionId, epoch, command, payload }, binary); } catch (error) { reject(error); return; }
      const timer = setTimeout(() => { this.dispose(); reject(new Error("Worker request timed out.")); }, this.config.timeoutMs);
      this.pending.set(requestId, { resolve: resolveResult, reject, timer, sessionId, epoch });
      this.child.stdin.write(packet);
    });
    const promise = this.tail.then(run); this.tail = promise.catch(() => {}); return promise;
  }
  async close() { try { if (this.child && !this.disposed) await this.request("close"); } finally { this.dispose(); } }
  dispose() { this.disposed = true; this.child?.kill(); for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error("Worker disposed.")); } this.pending.clear(); }
}
export function createNativeEmulatorWorkerKit(config) {
  return adapterKit({ id: "native-emulator-worker-kit", domain: "emulator-worker", domainPath: "n:host:extensions:emulator-worker", parentDomainPath: "n:host:extensions", apiName: "emulatorWorker", provides: ["emulation:worker"], config, createApi() { return { client: new NativeEmulatorWorkerClient(config) }; } });
}
