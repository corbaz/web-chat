// ─── Neumorphic Design System ────────────────────────────────────────────────
// Palettes: "Midnight Cosmos" (dark) · "Pearl Cloud" (light)
// Shadow model: dual-source — one light (top-left), one dark (bottom-right)
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorPalette {
  // Core palette
  primary: string;
  secondary: string;
  accent: string;       // Primary accent — periwinkle/indigo
  accentAlt: string;    // Secondary accent — soft violet
  background: string;   // Base surface (all nm elements share this color)
  surface: string;      // Raised surface (slightly lighter/darker than bg)
  text: string;
  textMuted: string;

  // Component tokens
  title: {
    color: string;
  };
  chat: {
    background: string;
    border: string;
  };
  messages: {
    ai: {
      background: string;
      text: string;
    };
    user: {
      background: string;
      text: string;
    };
    loading: {
      background: string;
      text: string;
    };
  };
  input: {
    background: string;
    text: string;
    placeholder: string;
  };
  scrollbar: {
    thumb: string;
    track: string;
  };
  button: {
    background: string; // Must equal `background` for neumorphic effect
    text: string;
  };

  // ─── Neumorphic shadow system ───────────────────────────────────────────────
  shadow: {
    outer: string;   // Raised / convex (default resting state)
    inset: string;   // Pressed / concave (active / input fields)
    sm: string;      // Smaller raised (compact elements)
    accent: string;  // Accent glow (focused / highlighted elements)
  };

  // Model selector (react-select custom theme)
  selectModel: {
    background: string;
    text: string;
    empresaBackground: string;
    empresaText: string;
    isSelectedBackground: string;
    isSelectedText: string;
    modelBackground: string;
    modelText: string;
    hoverBackground?: string;
    hoverText?: string;
  };
}

// ─── DARK THEME — "Midnight Cosmos" ──────────────────────────────────────────
// Deep midnight blue-gray · soft periwinkle accent · violet secondary
// Shadows: #12141e (dark) · #2d3258 (light)
// ─────────────────────────────────────────────────────────────────────────────
export const darkTheme: ColorPalette = {
  primary:     "#c8d0f0",
  secondary:   "#252a42",
  accent:      "#7c85f5",  // Periwinkle indigo — signature color
  accentAlt:   "#a78bfa",  // Soft violet
  background:  "#1e2235",  // Base surface
  surface:     "#252a42",  // Raised surface
  text:        "#c8d0f0",
  textMuted:   "#6870a0",

  title: {
    color: "#eef0ff",
  },
  chat: {
    background: "#1e2235",
    border:     "1px solid rgba(124, 133, 245, 0.12)",
  },
  messages: {
    user: {
      background: "#252a42",  // Elevated — floats above the page
      text:       "#c8d0f0",
    },
    ai: {
      background: "#1e2235",  // Flush with page surface
      text:       "#c8d0f0",
    },
    loading: {
      background: "#252a42",
      text:       "#c8d0f0",
    },
  },
  input: {
    background:  "#1e2235",
    text:        "#c8d0f0",
    placeholder: "#6870a0",
  },
  scrollbar: {
    thumb: "#7c85f5",
    track: "#252a42",
  },
  button: {
    background: "#1e2235",  // Same as bg — required for neumorphic effect
    text:       "#c8d0f0",
  },
  shadow: {
    outer:  "6px 6px 14px #12141e, -6px -6px 14px #2d3258",
    inset:  "inset 4px 4px 10px #12141e, inset -4px -4px 10px #2d3258",
    sm:     "3px 3px 8px #12141e, -3px -3px 8px #2d3258",
    accent: "0 0 18px rgba(124, 133, 245, 0.30), 0 0 40px rgba(124, 133, 245, 0.12)",
  },
  selectModel: {
    background:          "#252a42",
    text:                "#c8d0f0",
    empresaBackground:   "#12141e",
    empresaText:         "#c8d0f0",
    isSelectedBackground:"#7c85f5",
    isSelectedText:      "#ffffff",
    modelBackground:     "#1e2235",
    modelText:           "#c8d0f0",
    hoverBackground:     "#333b62",
    hoverText:           "#eef0ff",
  },
};

// ─── LIGHT THEME — "Pearl Cloud" ─────────────────────────────────────────────
// Warm-cool mist · periwinkle accent · deep navy text
// Shadows: #b8c0ce (dark) · #ffffff (light)
// ─────────────────────────────────────────────────────────────────────────────
export const lightTheme: ColorPalette = {
  primary:     "#2a3255",
  secondary:   "#eef2f8",
  accent:      "#5b6ef5",  // Periwinkle indigo
  accentAlt:   "#818cf8",  // Soft indigo
  background:  "#e8edf3",  // Pearl mist
  surface:     "#eef2f8",  // Raised surface
  text:        "#2a3255",
  textMuted:   "#7880a0",

  title: {
    color: "#1a2040",
  },
  chat: {
    background: "#e8edf3",
    border:     "1px solid rgba(91, 110, 245, 0.15)",
  },
  messages: {
    user: {
      background: "#eef2f8",  // Elevated — floats above the page
      text:       "#2a3255",
    },
    ai: {
      background: "#e8edf3",  // Flush with page surface
      text:       "#2a3255",
    },
    loading: {
      background: "#eef2f8",
      text:       "#2a3255",
    },
  },
  input: {
    background:  "#e8edf3",
    text:        "#2a3255",
    placeholder: "#7880a0",
  },
  scrollbar: {
    thumb: "#5b6ef5",
    track: "#d0d8e4",
  },
  button: {
    background: "#e8edf3",  // Same as bg — required for neumorphic effect
    text:       "#2a3255",
  },
  shadow: {
    outer:  "6px 6px 14px #b8c0ce, -6px -6px 14px #ffffff",
    inset:  "inset 4px 4px 10px #b8c0ce, inset -4px -4px 10px #ffffff",
    sm:     "3px 3px 8px #b8c0ce, -3px -3px 8px #ffffff",
    accent: "0 0 18px rgba(91, 110, 245, 0.25), 0 0 40px rgba(91, 110, 245, 0.10)",
  },
  selectModel: {
    background:          "#eef2f8",
    text:                "#2a3255",
    empresaBackground:   "#2a3255",
    empresaText:         "#eef2f8",
    isSelectedBackground:"#5b6ef5",
    isSelectedText:      "#ffffff",
    modelBackground:     "#e8edf3",
    modelText:           "#2a3255",
    hoverBackground:     "#d8e0ec",
    hoverText:           "#1a2040",
  },
};

// Default export — dark theme
export const colorPalette = darkTheme;
