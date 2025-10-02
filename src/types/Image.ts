import type { Pt } from "pts";

export interface CollageImage {
  id: string;
  img: HTMLImageElement;
  position: Pt;
  scale: number;
  rotation: number;
  cutoutRegions?: Pt[][];
  erasedPixels?: Set<string>;
  modifiedCanvas?: HTMLCanvasElement;
}

export type ToolMode = "move" | "resize" | "cut" | "erase";
