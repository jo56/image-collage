import { useRef, useEffect } from "react";
import type { ThemeConfig } from "../themes/theme";

type ToolMode = "move" | "resize" | "cut" | "erase";

interface SettingsPanelProps {
  visible: boolean;
  currentMode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onImageUpload: (file: File) => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  theme: ThemeConfig;
  onThemeChange: (themeId: string) => void;
  availableThemes: ThemeConfig[];
}

export function SettingsPanel({
  visible,
  currentMode,
  onModeChange,
  onImageUpload,
  position,
  onPositionChange,
  theme,
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
        background: theme.panel.background,
        padding: "12px",
        borderRadius: theme.panel.borderRadius,
        border: `${theme.panel.borderWidth} solid ${theme.panel.border}`,
        boxShadow: theme.panel.shadow || theme.panel.glow || 'none',
        zIndex: 1000,
        minWidth: "280px",
        display: visible ? "block" : "none",
        fontFamily: theme.panel.fontFamily,
        fontSize: theme.panel.fontSize,
      }}
    >
      <h3
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: "0 0 12px 0",
          fontSize: "1.1rem",
          fontWeight: "normal",
          color: theme.panel.textColor,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        Image Collage 2NW
      </h3>

      <div style={{ marginBottom: "12px" }} onClick={(e) => e.stopPropagation()}>
        <label
          style={{
            display: "inline-block",
            cursor: "pointer",
            padding: "6px 12px",
            backgroundColor: theme.panel.buttonBg,
            color: theme.panel.textColor,
            borderRadius: theme.panel.buttonRadius,
            textAlign: "center",
            fontSize: "0.95rem",
            border: `1px solid ${theme.panel.buttonBorder}`,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          Upload File
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: theme.panel.textSecondary }}>
          Mode:
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["move", "resize", "cut", "erase"] as ToolMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              style={{
                padding: "6px 12px",
                borderRadius: theme.panel.buttonRadius,
                background: currentMode === mode ? theme.panel.buttonActiveBg : theme.panel.buttonBg,
                color: currentMode === mode ? theme.panel.buttonActiveText : theme.panel.textColor,
                border: `1px solid ${theme.panel.buttonBorder}`,
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
          borderTop: `1px solid ${theme.panel.border}`,
          fontSize: "0.75rem",
          color: theme.panel.textSecondary,
        }}
      >
        <p style={{ margin: "0" }}>Press Shift to toggle</p>
      </div>
    </div>
  );
}
