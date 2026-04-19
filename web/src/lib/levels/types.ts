export type AnchorDef = {
  id: string;
  x: number;
  y: number;
};

export type LevelDef = {
  id: number;
  name: string;
  /** World size */
  worldWidth: number;
  worldHeight: number;
  /** Static cliff bodies: center x, center y, width, height */
  cliffs: { cx: number; cy: number; w: number; h: number }[];
  anchors: AnchorDef[];
  /** Vehicle spawn (center) */
  spawn: { x: number; y: number };
  /** Win when vehicle center passes this x */
  goalX: number;
  maxBeams: number;
  /** Lose if below this y */
  abyssY: number;
};
