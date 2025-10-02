type ToolMode = "move" | "resize" | "cut" | "erase";

interface SettingsPanelProps {
  visible: boolean;
  position: { x: number; y: number };
  currentMode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onImageUpload: (file: File) => void;
}

export function SettingsPanel({
  visible,
  position,
  currentMode,
  onModeChange,
  onImageUpload,
}: SettingsPanelProps) {
  if (!visible) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = "";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 1000,
        minWidth: "200px",
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600 }}>
        Collage Tools
      </h3>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            cursor: "pointer",
            padding: "8px",
            backgroundColor: "#007bff",
            color: "white",
            borderRadius: "4px",
            textAlign: "center",
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

      <div>
        <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 600 }}>
          Mode:
        </p>
        {(["move", "resize", "cut", "erase"] as ToolMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              marginBottom: "4px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: currentMode === mode ? "#007bff" : "white",
              color: currentMode === mode ? "white" : "black",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #eee",
          fontSize: "11px",
          color: "#666",
        }}
      >
        <p style={{ margin: "0" }}>Press Shift to toggle this panel</p>
      </div>
    </div>
  );
}
