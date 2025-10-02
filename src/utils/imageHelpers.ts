import type { CollageImage } from "../types/Image";
import type { Pt } from "pts";

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function createCollageImage(img: HTMLImageElement, position: Pt): CollageImage {
  return {
    id: `img-${Date.now()}-${Math.random()}`,
    img,
    position,
    scale: 1,
    rotation: 0,
  };
}

export function isPointInImage(pt: Pt, image: CollageImage): boolean {
  const halfWidth = (image.img.width * image.scale) / 2;
  const halfHeight = (image.img.height * image.scale) / 2;

  return (
    pt.x >= image.position.x - halfWidth &&
    pt.x <= image.position.x + halfWidth &&
    pt.y >= image.position.y - halfHeight &&
    pt.y <= image.position.y + halfHeight
  );
}
