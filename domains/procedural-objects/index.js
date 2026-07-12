import {
  createProceduralObjectBodyKit
} from "../../kits/procedural-objects/procedural-object-body-kit/index.js";
import {
  createProceduralObjectMaterialKit
} from "../../kits/procedural-objects/procedural-object-material-kit/index.js";
import {
  createProceduralObjectLodKit
} from "../../kits/procedural-objects/procedural-object-lod-kit/index.js";
import {
  createProceduralObjectCaptureProfileKit
} from "../../kits/procedural-objects/procedural-object-capture-profile-kit/index.js";

export const domainId = "procedural-objects";

export function createProceduralObjectsDomainKits(config = {}) {
  return [
    createProceduralObjectBodyKit(config.body ?? {}),
    createProceduralObjectMaterialKit(config.material ?? {}),
    createProceduralObjectLodKit(config.lod ?? {}),
    createProceduralObjectCaptureProfileKit(config.captureProfile ?? {})
  ];
}

export default createProceduralObjectsDomainKits;
