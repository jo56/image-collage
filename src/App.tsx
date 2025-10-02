import { useEffect, useRef, useState } from "react";
import { CanvasSpace, CanvasForm, Pt, Circle } from "pts";
import { SettingsPanel } from "./components/SettingsPanel";
import type { CollageImage, ToolMode } from "./types/Image";
import type { ViewportTransform } from "./utils/canvasHelpers";
import { screenToWorld, worldToScreen } from "./utils/canvasHelpers";
import { loadImageFromFile, createCollageImage, isPointInImage } from "./utils/imageHelpers";
import { themes } from "./themes/theme";
import type { ThemeConfig } from "./themes/theme";
import "./App.css";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spaceRef = useRef<CanvasSpace | null>(null);
  const formRef = useRef<CanvasForm | null>(null);

  const [images, setImages] = useState<CollageImage[]>([]);
  const [currentMode, setCurrentMode] = useState<ToolMode>("move");
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [settingsPosition, setSettingsPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 4 });
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themes.find(t => t.id === 'newspaper') || themes[0]);

  const mousePositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentModeRef = useRef<ToolMode>(currentMode);
  const imagesRef = useRef<CollageImage[]>(images);
  const currentThemeRef = useRef<ThemeConfig>(currentTheme);

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
    currentThemeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const space = new CanvasSpace(canvasRef.current);
    const form = space.getForm();

    spaceRef.current = space;
    formRef.current = form;

    space.setup({ bgcolor: currentTheme.canvas.background, resize: true, retina: true });
    space.bindMouse().bindTouch();

    // Erase function
    const eraseAtPoint = (img: CollageImage, worldPt: Pt) => {
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

        // Clear canvas with theme background
        const theme = currentThemeRef.current;
        if (theme.canvas.gradient) {
          const gradient = ctx.createLinearGradient(0, 0, space.width, space.height);
          gradient.addColorStop(0, theme.canvas.gradient.from);
          gradient.addColorStop(1, theme.canvas.gradient.to);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, space.width, space.height);
        } else {
          form.fill(theme.canvas.background).rect([[0, 0], space.size]);
        }

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

        // Draw overlay effects
        if (theme.canvas.overlay && theme.canvas.overlay.type !== 'none') {
          const overlay = theme.canvas.overlay;
          ctx.globalAlpha = overlay.opacity;

          if (overlay.type === 'scanlines') {
            ctx.strokeStyle = overlay.color || '#ffffff';
            ctx.lineWidth = 1;
            for (let y = 0; y < space.height; y += 4) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(space.width, y);
              ctx.stroke();
            }
          } else if (overlay.type === 'grid') {
            ctx.strokeStyle = overlay.color || '#ffffff';
            ctx.lineWidth = 0.5;
            const gridSize = 50;
            for (let x = 0; x < space.width; x += gridSize) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, space.height);
              ctx.stroke();
            }
            for (let y = 0; y < space.height; y += gridSize) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(space.width, y);
              ctx.stroke();
            }
          } else if (overlay.type === 'grain') {
            const imageData = ctx.getImageData(0, 0, space.width, space.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = Math.random() * 50 - 25;
              data[i] += noise;
              data[i + 1] += noise;
              data[i + 2] += noise;
            }
            ctx.putImageData(imageData, 0, 0);
          } else if (overlay.type === 'noise') {
            ctx.fillStyle = overlay.color || '#ffffff';
            for (let i = 0; i < 2000; i++) {
              const x = Math.random() * space.width;
              const y = Math.random() * space.height;
              ctx.fillRect(x, y, 1, 1);
            }
          } else if (overlay.type === 'vignette') {
            const gradient = ctx.createRadialGradient(
              space.width / 2, space.height / 2, 0,
              space.width / 2, space.height / 2, Math.max(space.width, space.height) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, space.width, space.height);
          }

          ctx.globalAlpha = 1;
        }

        // Draw cut path in screen space
        if (currentModeRef.current === "cut" && dragStateRef.current.cutPath.length > 0) {
          form.stroke(theme.colors.line, 2).fill(theme.colors.lineFill);
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
          form.stroke(theme.colors.cursor, 2).fill(theme.colors.lineFill);
          form.circle(Circle.fromCenter(space.pointer, brushSize));
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
              cutPath: [],
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
              dragStateRef.current.cutPath.push(worldPointer.clone());
            }
            const lastPoint = dragStateRef.current.cutPath[dragStateRef.current.cutPath.length - 1];
            if (worldPointer.$subtract(lastPoint).magnitude() > 3 / viewport.scale) {
              dragStateRef.current.cutPath.push(worldPointer.clone());
            }
          } else if (currentModeRef.current === "erase" && dragStateRef.current.selectedImage) {
            // Erase on drag
            dragStateRef.current.isErasing = true;
            eraseAtPoint(dragStateRef.current.selectedImage, worldPointer);
          } else if (dragStateRef.current.isPanning && dragStateRef.current.dragStart) {
            const delta = pointer.$subtract(dragStateRef.current.dragStart);
            viewport.offset = viewport.offset.$add(delta);
            dragStateRef.current.dragStart = pointer.clone();
          }
        }

        if (type === "up" || type === "drop") {
          const wasCutting = dragStateRef.current.isCutting;
          const cutPath = dragStateRef.current.cutPath;

          // Sync state after dragging or resizing
          if (dragStateRef.current.isDraggingImage || dragStateRef.current.isResizing) {
            setImages([...imagesRef.current]);
          }

          // If finishing a cut, create a composite image from all overlapping images
          if (wasCutting && cutPath.length >= 3) {
            // Calculate bounding box in world coordinates
            const worldMinX = Math.min(...cutPath.map(pt => pt.x));
            const worldMaxX = Math.max(...cutPath.map(pt => pt.x));
            const worldMinY = Math.min(...cutPath.map(pt => pt.y));
            const worldMaxY = Math.max(...cutPath.map(pt => pt.y));
            const worldWidth = worldMaxX - worldMinX;
            const worldHeight = worldMaxY - worldMinY;

            if (worldWidth > 0 && worldHeight > 0) {
              // Find all images that intersect with the cut path
              const affectedImages = imagesRef.current.filter((img) => {
                const hw = (img.img.width * img.scale) / 2;
                const hh = (img.img.height * img.scale) / 2;
                const imgMinX = img.position.x - hw;
                const imgMaxX = img.position.x + hw;
                const imgMinY = img.position.y - hh;
                const imgMaxY = img.position.y + hh;

                return !(imgMaxX < worldMinX || imgMinX > worldMaxX || imgMaxY < worldMinY || imgMinY > worldMaxY);
              });

              // Create a canvas to composite all affected images
              const compositeCanvas = document.createElement("canvas");
              compositeCanvas.width = Math.ceil(worldWidth);
              compositeCanvas.height = Math.ceil(worldHeight);
              const compositeCtx = compositeCanvas.getContext("2d")!;

              // Draw all affected images to the composite canvas
              affectedImages.forEach((img) => {
                const drawSource = img.modifiedCanvas || img.img;
                const imgX = img.position.x - (img.img.width * img.scale) / 2 - worldMinX;
                const imgY = img.position.y - (img.img.height * img.scale) / 2 - worldMinY;
                compositeCtx.drawImage(
                  drawSource,
                  imgX,
                  imgY,
                  img.img.width * img.scale,
                  img.img.height * img.scale
                );
              });

              // Create the cut piece canvas
              const cutCanvas = document.createElement("canvas");
              cutCanvas.width = compositeCanvas.width;
              cutCanvas.height = compositeCanvas.height;
              const cutCtx = cutCanvas.getContext("2d")!;

              // Apply the cut path as a mask
              cutCtx.save();
              cutCtx.beginPath();
              cutPath.forEach((pt, i) => {
                const localX = pt.x - worldMinX;
                const localY = pt.y - worldMinY;
                if (i === 0) cutCtx.moveTo(localX, localY);
                else cutCtx.lineTo(localX, localY);
              });
              cutCtx.closePath();
              cutCtx.clip();
              cutCtx.drawImage(compositeCanvas, 0, 0);
              cutCtx.restore();

              // Erase the cut region from all affected images
              affectedImages.forEach((img) => {
                const sourceImg = img.modifiedCanvas || img.img;
                if (!img.modifiedCanvas) {
                  img.modifiedCanvas = document.createElement("canvas");
                  img.modifiedCanvas.width = img.img.width;
                  img.modifiedCanvas.height = img.img.height;
                  const modCtx = img.modifiedCanvas.getContext("2d")!;
                  modCtx.drawImage(sourceImg, 0, 0);
                }

                const modCtx = img.modifiedCanvas.getContext("2d")!;
                modCtx.globalCompositeOperation = "destination-out";
                modCtx.beginPath();
                cutPath.forEach((pt, i) => {
                  const localX = (pt.x - img.position.x) / img.scale + img.img.width / 2;
                  const localY = (pt.y - img.position.y) / img.scale + img.img.height / 2;
                  if (i === 0) modCtx.moveTo(localX, localY);
                  else modCtx.lineTo(localX, localY);
                });
                modCtx.closePath();
                modCtx.fill();
                modCtx.globalCompositeOperation = "source-over";
              });

              // Create new image from the cut piece
              const newImg = new Image();
              newImg.onload = () => {
                const worldCenterX = (worldMinX + worldMaxX) / 2;
                const worldCenterY = (worldMinY + worldMaxY) / 2;

                const newCollageImage = createCollageImage(newImg, new Pt(worldCenterX, worldCenterY));
                newCollageImage.scale = 1;
                setImages((prev) => [...prev, newCollageImage]);
              };
              newImg.src = cutCanvas.toDataURL();
            }
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

      // Get the world position under the mouse before zoom
      const worldPointer = screenToWorld(pointer, viewport);

      // Apply zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      viewport.scale *= zoomFactor;
      viewport.scale = Math.max(0.1, Math.min(5, viewport.scale));

      // Adjust offset to keep the world point under the mouse cursor fixed
      // worldPoint = (pointer - offset) / scale
      // We want: (pointer - newOffset) / newScale = worldPoint
      // So: newOffset = pointer - worldPoint * newScale
      viewport.offset.x = pointer.x - worldPointer.x * viewport.scale;
      viewport.offset.y = pointer.y - worldPointer.y * viewport.scale;
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

  const handleThemeChange = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
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
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: currentTheme.canvas.background }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: getCursor() }} />
      <SettingsPanel
        visible={settingsVisible}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onImageUpload={handleImageUpload}
        position={settingsPosition}
        onPositionChange={setSettingsPosition}
        theme={currentTheme}
        onThemeChange={handleThemeChange}
        availableThemes={themes}
      />
    </div>
  );
}

export default App;
