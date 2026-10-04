import { adapterKit } from "../../emulation/kit-factory.js";
export function rasterToRgba(video, bytes) {
  const { width, height, pitch, format } = video, pixelBytes = format === 1 ? 4 : 2;
  if (![0, 1, 2].includes(format) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096 || pitch < width * pixelBytes || bytes.length < pitch * height) throw new Error("Invalid raster layout.");
  const output = new Uint8ClampedArray(width * height * 4), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * pitch + x * pixelBytes, i = (y * width + x) * 4;
    if (format === 1) { output[i] = bytes[offset + 2]; output[i + 1] = bytes[offset + 1]; output[i + 2] = bytes[offset]; }
    else { const value = view.getUint16(offset, true); output[i] = ((value >> (format === 2 ? 11 : 10)) & 31) * 255 / 31; output[i + 1] = ((value >> 5) & (format === 2 ? 63 : 31)) * 255 / (format === 2 ? 63 : 31); output[i + 2] = (value & 31) * 255 / 31; }
    output[i + 3] = 255;
  }
  return output;
}
export function createRasterFrameProviderKit() { return adapterKit({ id: "raster-frame-provider-kit", domain: "raster-frame-provider", domainPath: "n:presentation:extensions:raster-frame", parentDomainPath: "n:presentation:extensions", apiName: "rasterFrame", provides: ["presentation:emulator-raster"], createApi() { return { convert: rasterToRgba }; } }); }
