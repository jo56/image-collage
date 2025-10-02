import { Pt } from "pts";

export interface ViewportTransform {
  offset: Pt;
  scale: number;
}

export function screenToWorld(screenPt: Pt, viewport: ViewportTransform): Pt {
  return new Pt(
    (screenPt.x - viewport.offset.x) / viewport.scale,
    (screenPt.y - viewport.offset.y) / viewport.scale
  );
}

export function worldToScreen(worldPt: Pt, viewport: ViewportTransform): Pt {
  return new Pt(
    worldPt.x * viewport.scale + viewport.offset.x,
    worldPt.y * viewport.scale + viewport.offset.y
  );
}
