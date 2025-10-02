import { useEffect, useRef, useState } from "react";
import { CanvasSpace, CanvasForm, Pt } from "pts";
import { SettingsPanel } from "./components/SettingsPanel";
import type { CollageImage, ToolMode } from "./types/Image";
import type { ViewportTransform } from "./utils/canvasHelpers";
import { screenToWorld, worldToScreen } from "./utils/canvasHelpers";
import { loadImageFromFile, createCollageImage, isPointInImage } from "./utils/imageHelpers";
import "./App.css";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spaceRef = useRef<CanvasSpace | null>(null);
  const formRef = useRef<CanvasForm | null>(null);

  const [images, setImages] = useState<CollageImage[]>([]);
  const [currentMode, setCurrentMode] = useState<ToolMode>("move");
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [settingsPosition, setSettingsPosition] = useState({ x: 20, y: 20 });

  const viewportRef = useRef<ViewportTransform>({
    offset: new Pt(0, 0),
    scale: 1,
  });

  const dragStateRef = useRef<{
    isPanning: boolean;
    isDraggingImage: boolean;
    isResizing: boolean;
    isCutting: boolean;
    isErasing: boolean;
    resizeCorner: string | null;
    dragStart: Pt | null;
    selectedImage: CollageImage | null;
    imageStartPos: Pt | null;
    imageStartScale: number;
    cutPath: Pt[];
    eraseBrushSize: number;
  }>({
    isPanning: false,
    isDraggingImage: false,
    isResizing: false,
    isCutting: false,
    isErasing: false,
    resizeCorner: null,
    dragStart: null,
    selectedImage: null,
    imageStartPos: null,
    imageStartScale: 1,
    cutPath: [],
    eraseBrushSize: 20,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const space = new CanvasSpace(canvasRef.current);
    const form = space.getForm();

    spaceRef.current = space;
    formRef.current = form;

    space.setup({ bgcolor: "#f0f0f0", resize: true, retina: true });

    // Animation loop
    space.add({
      animate: () => {
        if (!form) return;

        const viewport = viewportRef.current;
        const ctx = form.ctx;

        // Clear canvas
        form.fill("#f0f0f0").rect([[0, 0], [space.size]]);

        // Draw grid
        ctx.save();
        ctx.translate(viewport.offset.x, viewport.offset.y);
        ctx.scale(viewport.scale, viewport.scale);

        const gridSize = 50;
        const startX = Math.floor(-viewport.offset.x / viewport.scale / gridSize) * gridSize;
        const startY = Math.floor(-viewport.offset.y / viewport.scale / gridSize) * gridSize;
        const endX = startX + space.width / viewport.scale + gridSize;
        const endY = startY + space.height / viewport.scale + gridSize;

        form.stroke("#ddd", 1 / viewport.scale);
        for (let x = startX; x <= endX; x += gridSize) {
          form.line([new Pt(x, startY), new Pt(x, endY)]);
        }
        for (let y = startY; y <= endY; y += gridSize) {
          form.line([new Pt(startX, y), new Pt(endX, y)]);
        }

        // Draw images
        images.forEach((img) => {
          const x = img.position.x - (img.img.width * img.scale) / 2;
          const y = img.position.y - (img.img.height * img.scale) / 2;

          // Use modified canvas if available (for erased images)
          const drawSource = img.modifiedCanvas || img.img;
          ctx.drawImage(
            drawSource,
            x,
            y,
            img.img.width * img.scale,
            img.img.height * img.scale
          );

          // Draw resize handles in resize mode
          if (currentMode === "resize" && dragStateRef.current.selectedImage?.id === img.id) {
            const handleSize = 10 / viewport.scale;
            const hw = (img.img.width * img.scale) / 2;
            const hh = (img.img.height * img.scale) / 2;

            form.fill("#007bff").stroke("#fff", 2 / viewport.scale);

            // Corner handles
            form.rect([
              [img.position.x - hw - handleSize / 2, img.position.y - hh - handleSize / 2],
              [img.position.x - hw + handleSize / 2, img.position.y - hh + handleSize / 2],
            ]);
            form.rect([
              [img.position.x + hw - handleSize / 2, img.position.y - hh - handleSize / 2],
              [img.position.x + hw + handleSize / 2, img.position.y - hh + handleSize / 2],
            ]);
            form.rect([
              [img.position.x - hw - handleSize / 2, img.position.y + hh - handleSize / 2],
              [img.position.x - hw + handleSize / 2, img.position.y + hh + handleSize / 2],
            ]);
            form.rect([
              [img.position.x + hw - handleSize / 2, img.position.y + hh - handleSize / 2],
              [img.position.x + hw + handleSize / 2, img.position.y + hh + handleSize / 2],
            ]);
          }
        });

        ctx.restore();

        // Draw cut path in screen space
        if (currentMode === "cut" && dragStateRef.current.cutPath.length > 0) {
          form.stroke("#ff0000", 2).fill("rgba(255, 0, 0, 0.1)");
          if (dragStateRef.current.cutPath.length > 2) {
            const screenPath = dragStateRef.current.cutPath.map((pt) =>
              worldToScreen(pt, viewport)
            );
            form.polygon(screenPath);
          } else {
            const screenPath = dragStateRef.current.cutPath.map((pt) =>
              worldToScreen(pt, viewport)
            );
            if (screenPath.length === 2) {
              form.line(screenPath);
            }
          }
        }

        // Draw erase brush cursor in erase mode
        if (currentMode === "erase") {
          const brushSize = dragStateRef.current.eraseBrushSize;
          form.stroke("#ff0000", 2).fill("rgba(255, 0, 0, 0.1)");
          form.circle([space.pointer, brushSize]);
        }

        // Draw mode indicator
        form.fill("#333").font(14).text([new Pt(10, space.height - 10)], `Mode: ${currentMode}`);
      },

      action: (type, px, py) => {
        const viewport = viewportRef.current;
        const pointer = new Pt(px, py);
        const worldPointer = screenToWorld(pointer, viewport);

        if (type === "down") {
          // Find clicked image (reverse order to get top image)
          const clickedImage = [...images].reverse().find((img) =>
            isPointInImage(worldPointer, img)
          );

          if (currentMode === "move" && clickedImage) {
            dragStateRef.current = {
              ...dragStateRef.current,
              isDraggingImage: true,
              selectedImage: clickedImage,
              imageStartPos: clickedImage.position.clone(),
              dragStart: pointer.clone(),
              imageStartScale: clickedImage.scale,
            };
          } else if (currentMode === "resize" && clickedImage) {
            // Check if clicking on a resize handle
            const handleSize = 10 / viewport.scale;
            const hw = (clickedImage.img.width * clickedImage.scale) / 2;
            const hh = (clickedImage.img.height * clickedImage.scale) / 2;

            const corners = [
              { name: "tl", x: clickedImage.position.x - hw, y: clickedImage.position.y - hh },
              { name: "tr", x: clickedImage.position.x + hw, y: clickedImage.position.y - hh },
              { name: "bl", x: clickedImage.position.x - hw, y: clickedImage.position.y + hh },
              { name: "br", x: clickedImage.position.x + hw, y: clickedImage.position.y + hh },
            ];

            const clickedCorner = corners.find(
              (c) =>
                worldPointer.x >= c.x - handleSize &&
                worldPointer.x <= c.x + handleSize &&
                worldPointer.y >= c.y - handleSize &&
                worldPointer.y <= c.y + handleSize
            );

            if (clickedCorner) {
              dragStateRef.current = {
                ...dragStateRef.current,
                isResizing: true,
                resizeCorner: clickedCorner.name,
                selectedImage: clickedImage,
                dragStart: worldPointer.clone(),
                imageStartPos: clickedImage.position.clone(),
                imageStartScale: clickedImage.scale,
              };
            } else {
              dragStateRef.current = {
                ...dragStateRef.current,
                selectedImage: clickedImage,
                imageStartScale: clickedImage.scale,
              };
            }
          } else if (currentMode === "cut" && clickedImage) {
            // Start drawing cut path
            dragStateRef.current = {
              ...dragStateRef.current,
              isCutting: true,
              selectedImage: clickedImage,
              cutPath: [worldPointer.clone()],
              imageStartScale: clickedImage.scale,
            };
          } else if (currentMode === "erase" && clickedImage) {
            // Start erasing
            dragStateRef.current = {
              ...dragStateRef.current,
              isErasing: true,
              selectedImage: clickedImage,
              imageStartScale: clickedImage.scale,
            };

            // Start erasing at this point
            eraseAtPoint(clickedImage, worldPointer, viewport.scale);
          } else {
            dragStateRef.current = {
              ...dragStateRef.current,
              isPanning: true,
              dragStart: pointer.clone(),
              imageStartScale: 1,
              cutPath: [],
            };
          }
        }

        if (type === "move") {
          if (dragStateRef.current.isDraggingImage && dragStateRef.current.selectedImage && dragStateRef.current.dragStart && dragStateRef.current.imageStartPos) {
            const delta = pointer.$subtract(dragStateRef.current.dragStart);
            const worldDelta = new Pt(delta.x / viewport.scale, delta.y / viewport.scale);

            setImages((prev) =>
              prev.map((img) =>
                img.id === dragStateRef.current.selectedImage?.id
                  ? { ...img, position: dragStateRef.current.imageStartPos!.$add(worldDelta) }
                  : img
              )
            );
          } else if (dragStateRef.current.isResizing && dragStateRef.current.selectedImage && dragStateRef.current.dragStart) {
            const delta = worldPointer.$subtract(dragStateRef.current.dragStart);
            const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
            const sign = (delta.x + delta.y) > 0 ? 1 : -1;
            const scaleDelta = (sign * distance) / 100;

            const newScale = Math.max(0.1, dragStateRef.current.imageStartScale + scaleDelta);

            setImages((prev) =>
              prev.map((img) =>
                img.id === dragStateRef.current.selectedImage?.id
                  ? { ...img, scale: newScale }
                  : img
              )
            );
          } else if (dragStateRef.current.isCutting) {
            // Add point to cut path
            const lastPoint = dragStateRef.current.cutPath[dragStateRef.current.cutPath.length - 1];
            if (lastPoint && worldPointer.$subtract(lastPoint).magnitude() > 10 / viewport.scale) {
              dragStateRef.current.cutPath.push(worldPointer.clone());
            }
          } else if (dragStateRef.current.isErasing && dragStateRef.current.selectedImage) {
            // Continue erasing
            eraseAtPoint(dragStateRef.current.selectedImage, worldPointer, viewport.scale);
          } else if (dragStateRef.current.isPanning && dragStateRef.current.dragStart) {
            const delta = pointer.$subtract(dragStateRef.current.dragStart);
            viewport.offset = viewport.offset.$add(delta);
            dragStateRef.current.dragStart = pointer.clone();
          }
        }

        if (type === "up") {
          // If finishing a cut, create a new image from the cut region
          if (dragStateRef.current.isCutting && dragStateRef.current.cutPath.length > 2 && dragStateRef.current.selectedImage) {
            const cutImage = dragStateRef.current.selectedImage;

            // Create a temporary canvas to extract the cut region
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = cutImage.img.width;
            tempCanvas.height = cutImage.img.height;
            const tempCtx = tempCanvas.getContext("2d")!;

            // Translate path to image-local coordinates
            const localPath = dragStateRef.current.cutPath.map((pt) => {
              const localX = (pt.x - cutImage.position.x) / cutImage.scale + cutImage.img.width / 2;
              const localY = (pt.y - cutImage.position.y) / cutImage.scale + cutImage.img.height / 2;
              return new Pt(localX, localY);
            });

            // Draw clipped image
            tempCtx.save();
            tempCtx.beginPath();
            localPath.forEach((pt, i) => {
              if (i === 0) tempCtx.moveTo(pt.x, pt.y);
              else tempCtx.lineTo(pt.x, pt.y);
            });
            tempCtx.closePath();
            tempCtx.clip();
            tempCtx.drawImage(cutImage.img, 0, 0);
            tempCtx.restore();

            // Create new image from canvas
            const newImg = new Image();
            newImg.onload = () => {
              // Calculate centroid of cut path for position
              const centroid = localPath.reduce((acc, pt) => acc.$add(pt), new Pt(0, 0)).$divide(localPath.length);
              const worldCentroid = new Pt(
                (centroid.x - cutImage.img.width / 2) * cutImage.scale + cutImage.position.x,
                (centroid.y - cutImage.img.height / 2) * cutImage.scale + cutImage.position.y
              );

              const newCollageImage = createCollageImage(newImg, worldCentroid);
              newCollageImage.scale = cutImage.scale;
              setImages((prev) => [...prev, newCollageImage]);
            };
            newImg.src = tempCanvas.toDataURL();
          }

          dragStateRef.current = {
            isPanning: false,
            isDraggingImage: false,
            isResizing: false,
            isCutting: false,
            isErasing: false,
            resizeCorner: null,
            dragStart: null,
            selectedImage: null,
            imageStartPos: null,
            imageStartScale: 1,
            cutPath: [],
            eraseBrushSize: 20,
          };
        }
      },
    });

    // Erase function
    const eraseAtPoint = (img: CollageImage, worldPt: Pt, viewportScale: number) => {
      // Ensure the image has a modified canvas
      if (!img.modifiedCanvas) {
        img.modifiedCanvas = document.createElement("canvas");
        img.modifiedCanvas.width = img.img.width;
        img.modifiedCanvas.height = img.img.height;
        const ctx = img.modifiedCanvas.getContext("2d")!;
        ctx.drawImage(img.img, 0, 0);
      }

      // Convert world point to image-local coordinates
      const localX = (worldPt.x - img.position.x) / img.scale + img.img.width / 2;
      const localY = (worldPt.y - img.position.y) / img.scale + img.img.height / 2;

      // Erase at this point
      const ctx = img.modifiedCanvas.getContext("2d")!;
      ctx.globalCompositeOperation = "destination-out";
      const brushSize = dragStateRef.current.eraseBrushSize / img.scale;
      ctx.beginPath();
      ctx.arc(localX, localY, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Force re-render
      setImages((prev) => [...prev]);
    };

    // Zoom handling
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const viewport = viewportRef.current;
      const pointer = new Pt(e.offsetX, e.offsetY);
      const worldPointerBefore = screenToWorld(pointer, viewport);

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      viewport.scale *= zoomFactor;
      viewport.scale = Math.max(0.1, Math.min(5, viewport.scale));

      const worldPointerAfter = screenToWorld(pointer, viewport);
      const worldDelta = worldPointerBefore.$subtract(worldPointerAfter);
      viewport.offset = viewport.offset.$add(worldDelta.$multiply(viewport.scale));
    };

    canvasRef.current.addEventListener("wheel", handleWheel);

    // Keyboard handling
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        if (settingsVisible) {
          setSettingsVisible(false);
        } else {
          setSettingsVisible(true);
          setSettingsPosition({ x: e.clientX + 10, y: e.clientY + 10 });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    space.play();

    return () => {
      space.dispose();
      canvasRef.current?.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images, currentMode, settingsVisible]);

  const handleImageUpload = async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      const viewport = viewportRef.current;
      const centerWorld = screenToWorld(
        new Pt(window.innerWidth / 2, window.innerHeight / 2),
        viewport
      );
      const newImage = createCollageImage(img, centerWorld);
      setImages((prev) => [...prev, newImage]);
    } catch (error) {
      console.error("Failed to load image:", error);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <SettingsPanel
        visible={settingsVisible}
        position={settingsPosition}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}

export default App;
