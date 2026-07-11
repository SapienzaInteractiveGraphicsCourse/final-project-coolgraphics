export const CAMERA_MODES = ["thirdPerson", "firstPerson", "topDown", "panorama"];

export const CAMERA_LABELS = {
  thirdPerson: "Third Person",
  firstPerson: "First Person",
  topDown: "Top-Down",
  panorama: "Panorama"
};

export const MUSEUM_STATE = {
  quiet: "quiet",
  awakening: "awakening"
};

export const MUSEUM_BOUNDS = {
  minX: -25.5,
  maxX: 25.5,
  minZ: -23.5,
  maxZ: 23.5
};

export const ROOM_RECTS = {
  hall: { minX: -8, maxX: 8, minZ: -6, maxZ: 6, center: [0, 0] },
  dinosaur: { minX: -25, maxX: -8, minZ: -6, maxZ: 6, center: [-16.5, 0] },
  statue: { minX: 8, maxX: 25, minZ: -6, maxZ: 6, center: [16.5, 0] },
  egyptian: { minX: -8, maxX: 8, minZ: -23, maxZ: -6, center: [0, -14.5] },
  gallery: { minX: -8, maxX: 8, minZ: 6, maxZ: 23, center: [0, 14.5] }
};

export const QUALITY_SETTINGS = {
  low: { pixelRatio: 0.85, shadows: false },
  medium: { pixelRatio: 1.25, shadows: true },
  high: { pixelRatio: 1.75, shadows: true }
};

export const COLORS = {
  night: 0x071027,
  wall: 0x9ea7ba,
  floor: 0x5c667a,
  trim: 0x263044,
  warm: 0xffc36d,
  torch: 0xff9a3d,
  bone: 0xe8dfc5,
  statue: 0xb7bcc9,
  gold: 0xd7a531
};
