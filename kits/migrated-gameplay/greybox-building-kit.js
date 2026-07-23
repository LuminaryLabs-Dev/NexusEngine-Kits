import { createSpatialRoomKit, normalizeBuildingDataset } from "./spatial-room-kit.js";

function roomPreset(id, options = {}) {
  const width = Number(options.width ?? 6);
  const depth = Number(options.depth ?? 5);
  const height = Number(options.height ?? 3);
  return {
    id,
    type: "rect",
    size: { width, depth, height },
    transform: options.transform ?? { x: 0, y: 0, z: 0, rotationY: 0 },
    floor: options.floor ?? { material: "matte-floor", color: "#484848" },
    walls: options.walls ?? { material: "matte-wall", color: "#707070" },
    ceiling: options.ceiling ?? { enabled: true, material: "matte-ceiling" },
    lighting: options.lighting ?? [{ id: `${id}-light`, type: "area", x: 0, y: height - 0.3, z: -1, intensity: 0.8 }],
    anchors: options.anchors ?? [
      { id: "center-floor", type: "floor", x: 0, y: 0, z: 0 },
      { id: "north-wall", type: "wall", x: 0, y: height * 0.48, z: -depth / 2 + 0.05 },
      { id: "south-wall", type: "wall", x: 0, y: height * 0.48, z: depth / 2 - 0.05 },
      { id: "left-wall", type: "wall", x: -width / 2 + 0.05, y: height * 0.48, z: 0 },
      { id: "right-wall", type: "wall", x: width / 2 - 0.05, y: height * 0.48, z: 0 }
    ]
  };
}

export function createGreyboxBuilding(options = {}) {
  const preset = options.preset ?? "single-room";
  const base = {
    id: options.id ?? preset,
    units: "meters",
    seed: options.seed ?? preset,
    scale: Number(options.scale ?? 1),
    rooms: [],
    connections: [],
    props: options.props ?? []
  };

  if (preset === "two-room") {
    base.rooms = [
      roomPreset("primary", { transform: { x: -2.6, y: 0, z: 0, rotationY: 0 }, width: 5, depth: 5 }),
      roomPreset("secondary", { transform: { x: 2.6, y: 0, z: 0, rotationY: 0 }, width: 5, depth: 5 })
    ];
    base.connections = [{ from: "primary", to: "secondary", kind: "doorway", width: 1.4 }];
  } else if (preset === "round-room") {
    base.rooms = [roomPreset("round", {
      width: 6,
      depth: 6,
      anchors: [
        { id: "center-floor", type: "floor", x: 0, y: 0, z: 0 },
        ...Array.from({ length: 8 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 8;
          return {
            id: `socket-${index + 1}`,
            type: "floor",
            x: Math.cos(angle) * 2.1,
            y: 0.1,
            z: Math.sin(angle) * 2.1,
            rotationY: -angle
          };
        })
      ]
    })];
  } else {
    base.rooms = [roomPreset("primary", options.room ?? {})];
  }

  return normalizeBuildingDataset({ ...base, ...options });
}

export function createGreyboxBuildingKit(config = {}) {
  const buildingDataset = config.buildingDataset ?? createGreyboxBuilding(config);
  return createSpatialRoomKit({
    id: config.id ?? "greybox-building-kit",
    buildingDataset,
    activeBuildingId: buildingDataset.id
  });
}
