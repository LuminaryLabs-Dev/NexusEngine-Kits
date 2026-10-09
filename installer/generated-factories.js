import { createAgricultureDomainKit as factory0 } from "../kits/production/agriculture-domain-kit/index.js";
import { createARExperienceKit as factory1 } from "../kits/migrated-gameplay/index.js";
import { createARKit as factory2 } from "../kits/migrated-gameplay/index.js";
import { createCameraCollisionKit as factory3 } from "../kits/migrated-gameplay/index.js";
import { createCameraSmoothFollowKit as factory4 } from "../kits/camera-feedback/camera-smooth-follow-kit/index.js";
import { createCharacterRagdollKit as factory5 } from "../kits/migrated-gameplay/index.js";
import { createCollectibleKit as factory6 } from "../kits/migrated-gameplay/index.js";
import { createCompanionCommandKit as factory7 } from "../kits/migrated-gameplay/index.js";
import { createConsoleInputAdapterKit as factory8 } from "../kits/input/console-input-adapter-kit/index.js";
import { createEmulatorMemoryObserverKit as factory9 } from "../kits/emulation/emulator-memory-observer-kit/index.js";
import { createFilesystemSnapshotAdapterKit as factory10 } from "../kits/persistence/filesystem-snapshot-adapter-kit/index.js";
import { createFishingKit as factory11 } from "../kits/aquatic/fishing-kit/index.js";
import { createForestPlacementKit as factory12 } from "../kits/migrated-gameplay/index.js";
import { createInteractionKit as factory13 } from "../kits/migrated-gameplay/index.js";
import { createGreyboxBuildingKit as factory14 } from "../kits/migrated-gameplay/index.js";
import { createInstancedRenderBatchKit as factory15 } from "../kits/render-descriptors/instanced-render-batch-kit/index.js";
import { createInteractionTargetKit as factory16 } from "../kits/migrated-gameplay/index.js";
import { createLibretroProviderKit as factory17 } from "../kits/emulation/libretro-provider-kit/index.js";
import { createLightCombatKit as factory18 } from "../kits/migrated-gameplay/index.js";
import { createLockAndSocketKit as factory19 } from "../kits/migrated-gameplay/index.js";
import { createMovingTargetKit as factory20 } from "../kits/migrated-gameplay/index.js";
import { createMultiplayerHostKit as factory21 } from "../kits/network/multiplayer-host-kit/index.js";
import { createNativeEmulatorWorkerKit as factory22 } from "../kits/host/native-emulator-worker-kit/index.js";
import { createNintendoContentLoaderKit as factory23 } from "../kits/asset/nintendo-content-loader-kit/index.js";
import { createObjectiveKit as factory24 } from "../kits/migrated-gameplay/index.js";
import { createObservedGameStateAdapterKit as factory25 } from "../kits/simulation/observed-game-state-adapter-kit/index.js";
import { createPcmAudioProviderKit as factory26 } from "../kits/presentation/pcm-audio-provider-kit/index.js";
import { createPeerJSTransportProvider as factory27 } from "../kits/network/peerjs-transport-provider-kit/index.js";
import { createPhysicsRuntimeAdapter as factory28 } from "../kits/physics/physics-runtime-adapter-kit/index.js";
import { createProceduralCreatureBodyKit as factory29 } from "../kits/procedural-creatures/procedural-creature-body-kit/index.js";
import { createProceduralObjectBodyKit as factory30 } from "../kits/procedural-objects/procedural-object-body-kit/index.js";
import { createProceduralObjectCaptureProfileKit as factory31 } from "../kits/procedural-objects/procedural-object-capture-profile-kit/index.js";
import { createProceduralObjectLodKit as factory32 } from "../kits/procedural-objects/procedural-object-lod-kit/index.js";
import { createProceduralObjectMaterialKit as factory33 } from "../kits/procedural-objects/procedural-object-material-kit/index.js";
import { createRapierPhysicsProvider as factory34 } from "../kits/physics/rapier-physics-provider-kit/index.js";
import { createRasterFrameProviderKit as factory35 } from "../kits/presentation/raster-frame-provider-kit/index.js";
import { createRenderDescriptorKit as factory36 } from "../kits/migrated-gameplay/index.js";
import { createRevealLightKit as factory37 } from "../kits/migrated-gameplay/index.js";
import { createRomTestRunnerKit as factory38 } from "../kits/diagnostics/rom-test-runner-kit/index.js";
import { createSeedKit as factory39 } from "../kits/foundation/seed-kit/index.js";
import { createSeededWorldPatchControllerKit as factory40 } from "../kits/simulation/seeded-world-patch-controller-kit/index.js";
import { createSortingKit as factory41 } from "../kits/migrated-gameplay/index.js";
import { createSpatialRoomKit as factory42 } from "../kits/migrated-gameplay/index.js";
import { createSurfacePlacementKit as factory43 } from "../kits/migrated-gameplay/index.js";
import { createSymbolAlignmentKit as factory44 } from "../kits/migrated-gameplay/index.js";
import { createThreePhysicsView as factory45 } from "../kits/rendering/three-physics-view-kit/index.js";
import { createWebGPUComputeProvider as factory46 } from "../kits/gpu-providers/webgpu-compute-provider-kit/index.js";
import { createWebGPUFrameExecutor as factory47 } from "../kits/gpu-providers/webgpu-frame-provider-kit/index.js";
import { createWebGPUHostProvider as factory48 } from "../kits/gpu-providers/webgpu-host-provider-kit/index.js";
import { createWebGPURenderProvider as factory49 } from "../kits/gpu-providers/webgpu-render-provider-kit/index.js";

export const GENERATED_KIT_FACTORIES = Object.freeze({
  "agriculture-domain-kit": factory0,
  "ar-experience-kit": factory1,
  "ar-kit": factory2,
  "camera-collision-kit": factory3,
  "camera-smooth-follow-kit": factory4,
  "character-ragdoll-kit": factory5,
  "collectible-kit": factory6,
  "companion-command-kit": factory7,
  "console-input-adapter-kit": factory8,
  "emulator-memory-observer-kit": factory9,
  "filesystem-snapshot-adapter-kit": factory10,
  "fishing-kit": factory11,
  "forest-placement-kit": factory12,
  "gameplay-interaction-kit": factory13,
  "greybox-building-kit": factory14,
  "instanced-render-batch-kit": factory15,
  "interaction-target-kit": factory16,
  "libretro-provider-kit": factory17,
  "light-combat-kit": factory18,
  "lock-and-socket-kit": factory19,
  "moving-target-kit": factory20,
  "multiplayer-host-kit": factory21,
  "native-emulator-worker-kit": factory22,
  "nintendo-content-loader-kit": factory23,
  "objective-kit": factory24,
  "observed-game-state-adapter-kit": factory25,
  "pcm-audio-provider-kit": factory26,
  "peerjs-transport-provider-kit": factory27,
  "physics-runtime-adapter-kit": factory28,
  "procedural-creature-body-kit": factory29,
  "procedural-object-body-kit": factory30,
  "procedural-object-capture-profile-kit": factory31,
  "procedural-object-lod-kit": factory32,
  "procedural-object-material-kit": factory33,
  "rapier-physics-provider-kit": factory34,
  "raster-frame-provider-kit": factory35,
  "render-descriptor-kit": factory36,
  "reveal-light-kit": factory37,
  "rom-test-runner-kit": factory38,
  "seed-kit": factory39,
  "seeded-world-patch-controller-kit": factory40,
  "sorting-kit": factory41,
  "spatial-room-kit": factory42,
  "surface-placement-kit": factory43,
  "symbol-alignment-kit": factory44,
  "three-physics-view-kit": factory45,
  "webgpu-compute-provider-kit": factory46,
  "webgpu-frame-provider-kit": factory47,
  "webgpu-host-provider-kit": factory48,
  "webgpu-render-provider-kit": factory49
});
