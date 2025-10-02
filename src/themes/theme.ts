export interface ThemeConfig {
  id: string;
  name: string;
  canvas: {
    background: string;
    gradient?: { from: string; to: string };
    overlay?: {
      type: 'scanlines' | 'grain' | 'grid' | 'texture' | 'noise' | 'vignette' | 'none';
      opacity: number;
      color?: string;
    };
  };
  colors: {
    cursor: string;
    line: string;
    lineFill: string;
  };
  panel: {
    background: string;
    border: string;
    borderWidth: string;
    borderRadius: string;
    shadow?: string;
    glow?: string;
    fontFamily: string;
    fontSize: string;
    textColor: string;
    textSecondary: string;
    buttonBg: string;
    buttonActiveBg: string;
    buttonActiveText: string;
    buttonBorder: string;
    buttonRadius: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    canvas: {
      background: '#000000',
      overlay: { type: 'none', opacity: 0 },
    },
    colors: {
      cursor: '#ffffff',
      line: '#ffffff',
      lineFill: 'rgba(255, 255, 255, 0.1)',
    },
    panel: {
      background: 'rgba(0, 0, 0, 0.9)',
      border: 'rgba(255, 255, 255, 0.3)',
      borderWidth: '1px',
      borderRadius: '10px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      textColor: '#ffffff',
      textSecondary: '#999',
      buttonBg: '#1a1a1a',
      buttonActiveBg: '#fff',
      buttonActiveText: '#000',
      buttonBorder: 'rgba(255, 255, 255, 0.3)',
      buttonRadius: '6px',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    canvas: {
      background: '#0d1117',
      overlay: { type: 'scanlines', opacity: 0.08, color: '#00ff00' },
    },
    colors: {
      cursor: '#00ff00',
      line: '#00ff00',
      lineFill: 'rgba(0, 255, 0, 0.15)',
    },
    panel: {
      background: 'rgba(13, 17, 23, 0.95)',
      border: '#00ff00',
      borderWidth: '2px',
      borderRadius: '0px',
      shadow: '0 0 20px rgba(0, 255, 0, 0.3)',
      fontFamily: '"Courier New", "Consolas", monospace',
      fontSize: '13px',
      textColor: '#00ff00',
      textSecondary: '#00cc00',
      buttonBg: '#1c2128',
      buttonActiveBg: '#00ff00',
      buttonActiveText: '#0d1117',
      buttonBorder: '#00ff00',
      buttonRadius: '0px',
    },
  },
  {
    id: 'neon',
    name: 'Neon City',
    canvas: {
      background: '#0a0015',
      gradient: { from: '#0a0015', to: '#1a003d' },
      overlay: { type: 'vignette', opacity: 0.4 },
    },
    colors: {
      cursor: '#ff006e',
      line: '#00f5ff',
      lineFill: 'rgba(0, 245, 255, 0.25)',
    },
    panel: {
      background: 'linear-gradient(135deg, rgba(26, 0, 61, 0.9), rgba(10, 0, 21, 0.9))',
      border: '#ff006e',
      borderWidth: '3px',
      borderRadius: '20px',
      shadow: '0 0 40px rgba(255, 0, 110, 0.6), inset 0 0 20px rgba(0, 245, 255, 0.2)',
      glow: '0 0 60px rgba(0, 245, 255, 0.4)',
      fontFamily: '"Orbitron", "Exo 2", sans-serif',
      fontSize: '14px',
      textColor: '#00f5ff',
      textSecondary: '#ff006e',
      buttonBg: 'rgba(26, 0, 61, 0.6)',
      buttonActiveBg: '#ff006e',
      buttonActiveText: '#ffffff',
      buttonBorder: '#00f5ff',
      buttonRadius: '15px',
    },
  },
  {
    id: 'newspaper',
    name: 'Newsprint',
    canvas: {
      background: '#f4f1ea',
      overlay: { type: 'none', opacity: 0 },
    },
    colors: {
      cursor: '#1a1a1a',
      line: '#1a1a1a',
      lineFill: 'rgba(26, 26, 26, 0.1)',
    },
    panel: {
      background: 'rgba(255, 255, 255, 0.85)',
      border: '#1a1a1a',
      borderWidth: '2px',
      borderRadius: '0px',
      shadow: '8px 8px 0px rgba(0, 0, 0, 0.2)',
      fontFamily: '"Times New Roman", "Georgia", serif',
      fontSize: '15px',
      textColor: '#1a1a1a',
      textSecondary: '#4a4a4a',
      buttonBg: '#e8e5dd',
      buttonActiveBg: '#1a1a1a',
      buttonActiveText: '#f4f1ea',
      buttonBorder: '#1a1a1a',
      buttonRadius: '0px',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    canvas: {
      background: '#ff6b35',
      gradient: { from: '#ff6b35', to: '#f7931e' },
      overlay: { type: 'none', opacity: 0 },
    },
    colors: {
      cursor: '#4a0e4e',
      line: '#4a0e4e',
      lineFill: 'rgba(74, 14, 78, 0.2)',
    },
    panel: {
      background: 'rgba(74, 14, 78, 0.85)',
      border: '#ff6b35',
      borderWidth: '4px',
      borderRadius: '25px',
      shadow: '0 10px 40px rgba(74, 14, 78, 0.5)',
      fontFamily: '"Quicksand", "Nunito", sans-serif',
      fontSize: '14px',
      textColor: '#fff5e6',
      textSecondary: '#ffd4a3',
      buttonBg: 'rgba(255, 107, 53, 0.3)',
      buttonActiveBg: '#ff6b35',
      buttonActiveText: '#4a0e4e',
      buttonBorder: '#ffd4a3',
      buttonRadius: '20px',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    canvas: {
      background: '#000000',
      overlay: { type: 'noise', opacity: 0.15, color: '#00ff41' },
    },
    colors: {
      cursor: '#00ff41',
      line: '#00ff41',
      lineFill: 'rgba(0, 255, 65, 0.2)',
    },
    panel: {
      background: 'rgba(0, 0, 0, 0.9)',
      border: '#00ff41',
      borderWidth: '1px',
      borderRadius: '2px',
      shadow: '0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 10px rgba(0, 255, 65, 0.1)',
      fontFamily: '"Courier New", "Consolas", monospace',
      fontSize: '12px',
      textColor: '#00ff41',
      textSecondary: '#008f11',
      buttonBg: '#001100',
      buttonActiveBg: '#00ff41',
      buttonActiveText: '#000000',
      buttonBorder: '#00ff41',
      buttonRadius: '0px',
    },
  },
  {
    id: 'chalk',
    name: 'Chalkboard',
    canvas: {
      background: '#2d3436',
      overlay: { type: 'grain', opacity: 0.3 },
    },
    colors: {
      cursor: '#ffffff',
      line: '#74b9ff',
      lineFill: 'rgba(116, 185, 255, 0.2)',
    },
    panel: {
      background: 'rgba(45, 52, 54, 0.95)',
      border: '#dfe6e9',
      borderWidth: '6px',
      borderRadius: '8px',
      shadow: '0 4px 0px #1e272e, 0 8px 20px rgba(0, 0, 0, 0.5)',
      fontFamily: '"Architects Daughter", "Comic Sans MS", cursive',
      fontSize: '15px',
      textColor: '#ffffff',
      textSecondary: '#b2bec3',
      buttonBg: '#636e72',
      buttonActiveBg: '#fdcb6e',
      buttonActiveText: '#2d3436',
      buttonBorder: '#dfe6e9',
      buttonRadius: '4px',
    },
  },
];
