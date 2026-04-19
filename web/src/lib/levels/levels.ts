import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Neon Span",
    worldWidth: 1200,
    worldHeight: 720,
    cliffs: [
      { cx: 180, cy: 580, w: 320, h: 120 },
      { cx: 1020, cy: 580, w: 320, h: 120 },
    ],
    anchors: [
      { id: "L1", x: 300, y: 520 },
      { id: "L2", x: 300, y: 460 },
      { id: "R1", x: 900, y: 520 },
      { id: "R2", x: 900, y: 460 },
    ],
    spawn: { x: 220, y: 536 },
    goalX: 860,
    maxBeams: 8,
    abyssY: 680,
  },
  {
    id: 2,
    name: "Void Crossing",
    worldWidth: 1400,
    worldHeight: 760,
    cliffs: [
      { cx: 160, cy: 600, w: 280, h: 140 },
      { cx: 1240, cy: 600, w: 280, h: 140 },
    ],
    anchors: [
      { id: "L1", x: 260, y: 540 },
      { id: "L2", x: 260, y: 460 },
      { id: "L3", x: 260, y: 380 },
      { id: "R1", x: 1140, y: 540 },
      { id: "R2", x: 1140, y: 460 },
      { id: "R3", x: 1140, y: 380 },
    ],
    spawn: { x: 200, y: 556 },
    goalX: 1040,
    maxBeams: 6,
    abyssY: 700,
  },
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
