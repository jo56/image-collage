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
  const [settingsPosition, setSettingsPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 4 });

  const mousePositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentModeRef = useRef<ToolMode>(currentMode);
  const imagesRef = useRef<CollageImage[]>(images);

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
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        e.preventDefault();
        setSettingsVisible((prev) => {
          if (!prev) {
            // Reappearing - position at mouse cursor
            setSettingsPosition(mousePositionRef.current);
          }
          return !prev;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const space = new CanvasSpace(canvasRef.current);
    const form = space.getForm();

    spaceRef.current = space;
    formRef.current = form;

    space.setup({ bgcolor: "#000000", resize: true, retina: true });
    space.bindMouse().bindTouch();

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

    // Animation loop
    space.add({
      animate: () => {
        if (!form) return;

        const viewport = viewportRef.current;
        const ctx = form.ctx;

        // Clear canvas
        form.fill("#000000").rect([[0, 0], [space.size]]);

        // Draw images
        ctx.save();
        ctx.translate(viewport.offset.x, viewport.offset.y);
        ctx.scale(viewport.scale, viewport.scale);
        imagesRef.current.forEach((img) => {
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

          // No selection highlights needed - images are always visible
        });

        ctx.restore();

        // Draw cut path in screen space
        if (currentModeRef.current === "cut" && dragStateRef.current.cutPath.length > 0) {
          form.stroke("#ffffff", 2).fill("rgba(255, 255, 255, 0.1)");
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
        if (currentModeRef.current === "erase") {
          const brushSize = dragStateRef.current.eraseBrushSize;
          form.stroke("#ffffff", 2).fill("rgba(255, 255, 255, 0.1)");
          form.circle([space.pointer, brushSize]);
        }

      },

      action: (type, px, py) => {
        const viewport = viewportRef.current;
        const pointer = new Pt(px, py);
        const worldPointer = screenToWorld(pointer, viewport);


        if (type === "down") {
          // Find clicked image (reverse order to get top image)
          const clickedImage = [...imagesRef.current].reverse().find((img) =>
            isPointInImage(worldPointer, img)
          );

          if (currentModeRef.current === "move" && clickedImage) {
            // Bring image to front
            setImages((prev) => {
              const filtered = prev.filter(img => img.id !== clickedImage.id);
              return [...filtered, clickedImage];
            });

            // Only mark as dragging, don't move yet
            dragStateRef.current = {
              ...dragStateRef.current,
              selectedImage: clickedImage,
              imageStartPos: clickedImage.position.clone(),
              dragStart: worldPointer.clone(),
              imageStartScale: clickedImage.scale,
            };
          } else if (currentModeRef.current === "resize" && clickedImage) {
            // Check if clicking on a resize handle
            // Select image for resizing
            dragStateRef.current = {
              ...dragStateRef.current,
              selectedImage: clickedImage,
              dragStart: worldPointer.clone(),
              imageStartPos: clickedImage.position.clone(),
              imageStartScale: clickedImage.scale,
            };
          } else if (currentModeRef.current === "cut" && clickedImage) {
            // Start drawing cut path on the clicked image
            dragStateRef.current = {
              ...dragStateRef.current,
              selectedImage: clickedImage,
              imageStartScale: clickedImage.scale,
            };
          } else if (currentModeRef.current === "erase" && clickedImage) {
            // Start erasing
            dragStateRef.current = {
              ...dragStateRef.current,
              selectedImage: clickedImage,
              imageStartScale: clickedImage.scale,
            };
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

        if (type === "drag") {
          if (currentModeRef.current === "move" && dragStateRef.current.selectedImage && dragStateRef.current.dragStart && dragStateRef.current.imageStartPos) {
            dragStateRef.current.isDraggingImage = true;
            const delta = worldPointer.$subtract(dragStateRef.current.dragStart);
            const newPosition = dragStateRef.current.imageStartPos.$add(delta);

            // Update directly in the ref for smooth movement
            const imgIndex = imagesRef.current.findIndex(img => img.id === dragStateRef.current.selectedImage?.id);
            if (imgIndex !== -1) {
              imagesRef.current[imgIndex].position = newPosition;
            }
          } else if (currentModeRef.current === "resize" && dragStateRef.current.selectedImage && dragStateRef.current.dragStart) {
            dragStateRef.current.isResizing = true;
            const delta = worldPointer.$subtract(dragStateRef.current.dragStart);
            const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
            const sign = (delta.x + delta.y) > 0 ? 1 : -1;
            const scaleDelta = (sign * distance) / 100;

            const newScale = Math.max(0.1, dragStateRef.current.imageStartScale + scaleDelta);

            // Update directly in ref
            const imgIndex = imagesRef.current.findIndex(img => img.id === dragStateRef.current.selectedImage?.id);
            if (imgIndex !== -1) {
              imagesRef.current[imgIndex].scale = newScale;
            }
          } else if (currentModeRef.current === "cut" && dragStateRef.current.selectedImage) {
            // Start/continue drawing cut path
            dragStateRef.current.isCutting = true;
            if (dragStateRef.current.cutPath.length === 0) {
              dragStateRef.current.cutPath = [worldPointer.clone()];
            } else {
              const lastPoint = dragStateRef.current.cutPath[dragStateRef.current.cutPath.length - 1];
              if (lastPoint && worldPointer.$subtract(lastPoint).magnitude() > 10 / viewport.scale) {
                dragStateRef.current.cutPath.push(worldPointer.clone());
              }
            }
          } else if (currentModeRef.current === "erase" && dragStateRef.current.selectedImage) {
            // Erase on drag
            dragStateRef.current.isErasing = true;
            eraseAtPoint(dragStateRef.current.selectedImage, worldPointer, viewport.scale);
          } else if (dragStateRef.current.isPanning && dragStateRef.current.dragStart) {
            const delta = pointer.$subtract(dragStateRef.current.dragStart);
            viewport.offset = viewport.offset.$add(delta);
            dragStateRef.current.dragStart = pointer.clone();
          }
        }

        if (type === "up") {
          // Sync state after dragging or resizing
          if (dragStateRef.current.isDraggingImage || dragStateRef.current.isResizing) {
            setImages([...imagesRef.current]);
          }

          // If finishing a cut, create a new image from the cut region
          if (dragStateRef.current.isCutting && dragStateRef.current.cutPath.length > 2 && dragStateRef.current.selectedImage) {
            const cutImage = dragStateRef.current.selectedImage;
            const sourceImg = cutImage.modifiedCanvas || cutImage.img;

            // Translate path to image-local coordinates
            const localPath = dragStateRef.current.cutPath.map((pt) => {
              const localX = (pt.x - cutImage.position.x) / cutImage.scale + cutImage.img.width / 2;
              const localY = (pt.y - cutImage.position.y) / cutImage.scale + cutImage.img.height / 2;
              return new Pt(localX, localY);
            });

            // Calculate bounding box of the cut path
            const minX = Math.min(...localPath.map(pt => pt.x));
            const maxX = Math.max(...localPath.map(pt => pt.x));
            const minY = Math.min(...localPath.map(pt => pt.y));
            const maxY = Math.max(...localPath.map(pt => pt.y));
            const width = maxX - minX;
            const height = maxY - minY;

            // Create canvas for the cut piece
            const cutCanvas = document.createElement("canvas");
            cutCanvas.width = width;
            cutCanvas.height = height;
            const cutCtx = cutCanvas.getContext("2d")!;

            // Draw the cut piece
            cutCtx.save();
            cutCtx.translate(-minX, -minY);
            cutCtx.beginPath();
            localPath.forEach((pt, i) => {
              if (i === 0) cutCtx.moveTo(pt.x, pt.y);
              else cutCtx.lineTo(pt.x, pt.y);
            });
            cutCtx.closePath();
            cutCtx.clip();
            cutCtx.drawImage(sourceImg, 0, 0);
            cutCtx.restore();

            // Erase from the original image
            if (!cutImage.modifiedCanvas) {
              cutImage.modifiedCanvas = document.createElement("canvas");
              cutImage.modifiedCanvas.width = cutImage.img.width;
              cutImage.modifiedCanvas.height = cutImage.img.height;
              const modCtx = cutImage.modifiedCanvas.getContext("2d")!;
              modCtx.drawImage(sourceImg, 0, 0);
              cutImage.modifiedCanvas = cutImage.modifiedCanvas;
            }

            const modCtx = cutImage.modifiedCanvas.getContext("2d")!;
            modCtx.globalCompositeOperation = "destination-out";
            modCtx.beginPath();
            localPath.forEach((pt, i) => {
              if (i === 0) modCtx.moveTo(pt.x, pt.y);
              else modCtx.lineTo(pt.x, pt.y);
            });
            modCtx.closePath();
            modCtx.fill();
            modCtx.globalCompositeOperation = "source-over";

            // Force update
            setImages((prev) => [...prev]);

            // Create new image from the cut piece
            const newImg = new Image();
            newImg.onload = () => {
              // Calculate world position for the cut piece
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;
              const worldPos = new Pt(
                (centerX - cutImage.img.width / 2) * cutImage.scale + cutImage.position.x,
                (centerY - cutImage.img.height / 2) * cutImage.scale + cutImage.position.y
              );

              const newCollageImage = createCollageImage(newImg, worldPos);
              newCollageImage.scale = cutImage.scale;
              setImages((prev) => [...prev, newCollageImage]);
            };
            newImg.src = cutCanvas.toDataURL();
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

    space.play();

    return () => {
      space.dispose();
      canvasRef.current?.removeEventListener("wheel", handleWheel);
    };
  }, []);

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

  const getCursor = () => {
    switch (currentMode) {
      case "move": return "move";
      case "resize": return "nwse-resize";
      case "cut": return "crosshair";
      case "erase": return "crosshair";
      default: return "default";
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: getCursor() }} />
      <SettingsPanel
        visible={settingsVisible}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onImageUpload={handleImageUpload}
        position={settingsPosition}
        onPositionChange={setSettingsPosition}
      />
    </div>
  );
}

export default App;
