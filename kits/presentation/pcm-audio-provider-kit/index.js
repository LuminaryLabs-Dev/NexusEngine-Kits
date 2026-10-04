import { adapterKit } from "../../emulation/kit-factory.js";
import { createPcmPlayback } from "./playback.js";
export { createPcmPlayback } from "./playback.js";
export function createPcmAudioProviderKit(config = {}) { return adapterKit({ id: "pcm-audio-provider-kit", domain: "pcm-audio-provider", domainPath: "n:presentation:extensions:pcm-audio", parentDomainPath: "n:presentation:extensions", apiName: "pcmAudio", provides: ["presentation:emulator-pcm"], config, createApi() { return { createPlayback: context => createPcmPlayback(context, config) }; } }); }
