export const CHUNK_SIZE = 256;
export const COOLDOWN_TIME = 4 * 1000;
export const MAX_COOLDOWN = 60 * 1000;

export const palette = [
  "#FFFFFF",
  "#E4E4E4",
  "#C4C4C4",
  "#888888",
  "#4E4E4E",
  "#000000",
  "#F4B3AE",
  "#FFA7D1",
  "#FF54B2",
  "#FF6565",
  "#E50000",
  "#9A0000",
  "#FEA460",
  "#E59500",
  "#A06A42",
  "#604028",
  "#FEDFB0",
  "#FFF889",
  "#E5D900",
  "#94E044",
  "#02BE01",
  "#688338",
  "#006513",
  "#CAE3FF",
  "#00D3DD",
  "#0083C7",
  "#0000EA",
  "#191973",
  "#CF6EE4",
  "#820080",
];

export const canvases = [
  {
    name: "Art",
    id: "art",
    boundingChunks: [
      [-2, -2],
      [1, 1]
    ]
  },
  {
    name: "World Map",
    id: "world",
    boundingChunks: [
      [-128, -128],
      [127, 127]
    ],
    locked: true,
  },
]