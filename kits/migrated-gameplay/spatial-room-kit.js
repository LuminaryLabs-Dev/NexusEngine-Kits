import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const SpatialRoomState = defineResource("spatial.roomState");

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeAnchor(anchor = {}, room = {}) {
  return {
    id: anchor.id ?? `${room.id ?? "room"}-anchor`,
    room: room.id,
    type: anchor.type ?? "floor",
    x: Number(anchor.x ?? 0),
    y: Number(anchor.y ?? 0),
    z: Number(anchor.z ?? 0),
    rotationY: Number(anchor.rotationY ?? 0),
    ...anchor
  };
}

function normalizeRoom(room = {}, index = 0) {
  return {
    id: room.id ?? `room-${index + 1}`,
    type: room.type ?? "rect",
    size: {
      width: Number(room.size?.width ?? 4),
      depth: Number(room.size?.depth ?? 4),
      height: Number(room.size?.height ?? 3)
    },
    transform: {
      x: Number(room.transform?.x ?? 0),
      y: Number(room.transform?.y ?? 0),
      z: Number(room.transform?.z ?? 0),
      rotationY: Number(room.transform?.rotationY ?? 0)
    },
    floor: room.floor ?? { material: "floor", color: "#565656" },
    walls: room.walls ?? { material: "wall", color: "#777777" },
    ceiling: room.ceiling ?? { enabled: true, material: "ceiling" },
    lighting: room.lighting ?? [],
    anchors: (room.anchors ?? []).map((anchor) => normalizeAnchor(anchor, room))
  };
}

export function normalizeBuildingDataset(dataset = {}) {
  const rooms = (dataset.rooms ?? []).map(normalizeRoom);
  return {
    id: dataset.id ?? "building",
    units: dataset.units ?? "meters",
    seed: dataset.seed ?? dataset.id ?? "building",
    scale: Number(dataset.scale ?? 1),
    rooms,
    connections: dataset.connections ?? [],
    props: dataset.props ?? [],
    anchors: rooms.flatMap((room) => room.anchors),
    metadata: dataset.metadata ?? {}
  };
}

export function createSpatialRoomKit(config = {}) {
  const buildings = (config.buildings ?? [config.buildingDataset]).filter(Boolean).map(normalizeBuildingDataset);
  const activeBuildingId = config.activeBuildingId ?? buildings[0]?.id ?? "building";

  return defineRuntimeKit({
    id: config.id ?? "spatial-room-kit",
    resources: { SpatialRoomState },
    initWorld({ world }) {
      world.setResource(SpatialRoomState, {
        buildings,
        activeBuildingId
      });
    },
    install({ engine }) {
      engine.spatialRoom = {
        getState() {
          return engine.world.getResource(SpatialRoomState);
        },
        getActiveBuilding() {
          const state = engine.world.getResource(SpatialRoomState);
          return state?.buildings?.find((building) => building.id === state.activeBuildingId) ?? null;
        },
        setActiveBuilding(id) {
          const state = engine.world.getResource(SpatialRoomState);
          engine.world.setResource(SpatialRoomState, { ...state, activeBuildingId: id });
          return this.getActiveBuilding();
        },
        getAnchor(id) {
          return this.getActiveBuilding()?.anchors?.find((anchor) => anchor.id === id) ?? null;
        },
        snapshot() {
          return clone(this.getActiveBuilding());
        }
      };
    },
    metadata: { purpose: "Generic spatial room and building descriptors." }
  });
}
