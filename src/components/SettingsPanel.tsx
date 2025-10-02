import { useState, useRef, useEffect, useCallback } from "react";

type ToolMode = "move" | "resize" | "cut" | "erase";

interface SettingsPanelProps {
  visible: boolean;
  currentMode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onImageUpload: (file: File) => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

export function SettingsPanel({
  visible,
  currentMode,
  onModeChange,
  onImageUpload,
  position,
  onPositionChange,
}: SettingsPanelProps) {
  const isDraggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = "";
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      onPositionChange({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    isDraggingRef.current = true;
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
        background: "rgba(0, 0, 0, 0.9)",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        zIndex: 1000,
        minWidth: "280px",
        display: visible ? "block" : "none",
      }}
    >
      <h3
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: "0 0 12px 0",
          fontSize: "1.1rem",
          fontWeight: "normal",
          color: "#fff",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        Collage Tools
      </h3>

      <div style={{ marginBottom: "12px" }} onClick={(e) => e.stopPropagation()}>
        <label
          style={{
            display: "inline-block",
            cursor: "pointer",
            padding: "6px 12px",
            backgroundColor: "#1a1a1a",
            color: "#fff",
            borderRadius: "6px",
            textAlign: "center",
            fontSize: "0.95rem",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#999" }}>
          Mode:
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["move", "resize", "cut", "erase"] as ToolMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: currentMode === mode ? "#fff" : "#1a1a1a",
                color: currentMode === mode ? "#000" : "#fff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                fontSize: "0.95rem",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          fontSize: "0.85rem",
          color: "#999",
        }}
      >
        <p style={{ margin: "0" }}>Press Shift to toggle</p>
      </div>
    </div>
  );
}
