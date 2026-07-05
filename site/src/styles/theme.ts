/**
 * OBSIDIAN PREMIUM V2 - DESIGN SYSTEM THEME TOKENS
 * This file contains the complete design system for the Obsidian Premium NFT Auction platform.
 * Formatted for direct integration in React (Tailwind CSS configuration or inline styles).
 */

export const theme = {
  name: "Obsidian Premium V2",
  mode: "dark",

  // Curated color palette from Stitch design
  colors: {
    background: "#0A0A0B", // Dark obsidian void base
    surface: "#111415", // Base surface color
    surfaceDim: "#111415", // Darker surface elevation
    surfaceBright: "#373a3b", // Lighter surface elevation
    surfaceVariant: "#323536",
    
    // Surface Containers
    surfaceContainerLowest: "#0c0f10",
    surfaceContainerLow: "#191c1d",
    surfaceContainer: "#1d2021",
    surfaceContainerHigh: "#282a2b",
    surfaceContainerHighest: "#323536",

    // Accents & Brand Identifiers
    primary: "#f2ca50", // Luminous Gold
    primaryContainer: "#d4af37", // Amber Gold accent
    secondary: "#bdf4ff", // Cyber Light Blue
    secondaryContainer: "#00e3fd", // Luminous Cyber Blue
    tertiary: "#d0cdcf",
    tertiaryContainer: "#b5b2b3",

    // Typography
    onBackground: "#e1e3e4",
    onSurface: "#e1e3e4",
    onSurfaceVariant: "#d0c5af",
    onPrimary: "#3c2f00",
    onPrimaryContainer: "#554300",
    onSecondary: "#00363d",
    onTertiary: "#313031",

    // Borders & Outlines
    outline: "#99907c",
    outlineVariant: "#4d4635",
    borderGlass: "rgba(255, 255, 255, 0.08)", // Transparent glass border

    // Status / Indicator Colors
    statusActive: "#10b981", // Green (LIVE/Active)
    statusUpcoming: "#f59e0b", // Amber/Gold (Upcoming)
    statusEnded: "#94a3b8", // Slate (Ended)
    error: "#ffb4ab",
    errorContainer: "#93000a",
  },

  // Typography scale using dynamic Google Fonts
  typography: {
    fontFamilies: {
      headline: "'Anybody', sans-serif", // Display, large titles
      body: "'Hanken Grotesk', sans-serif", // General text, labels
      mono: "'JetBrains Mono', monospace", // Tabular data, countdowns, statistics
    },
    styles: {
      displayLg: {
        fontFamily: "Anybody",
        fontWeight: "200",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
      headlineLg: {
        fontFamily: "Anybody",
        fontWeight: "300",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      },
      titleMd: {
        fontFamily: "Hanken Grotesk",
        fontWeight: "600",
        letterSpacing: "0.02em",
      },
      bodyLg: {
        fontFamily: "Hanken Grotesk",
        fontWeight: "300",
        lineHeight: "1.6",
      },
      bodyMd: {
        fontFamily: "Hanken Grotesk",
        fontWeight: "400",
        lineHeight: "1.5",
      },
      labelMono: {
        fontFamily: "JetBrains Mono",
        fontWeight: "400",
        letterSpacing: "0.05em",
      },
      timerDisplay: {
        fontFamily: "JetBrains Mono",
        fontWeight: "700",
      }
    }
  },

  // Bento layout spacing values
  spacing: {
    bentoGap: "20px",
    containerMax: "1440px",
    gridMargin: "40px",
    gridGutter: "20px",
  },

  // Shape borders
  borderRadius: {
    default: "0.25rem", // 4px
    lg: "0.5rem",       // 8px
    xl: "0.75rem",      // 12px
    full: "9999px",     // Pills, Avatars
  },

  // High-end atmospheric effects
  effects: {
    backdropBlur: "blur(30px)",
    glassBackground: "rgba(255, 255, 255, 0.03)",
    gridOverlay: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
    
    // Metallic Gradients
    goldBorderGradient: "linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(255, 255, 255, 0.05))",
    blueBorderGradient: "linear-gradient(135deg, rgba(0, 229, 255, 0.4), rgba(255, 255, 255, 0.05))",
    
    // Ambient Specular Glows
    shadows: {
      goldGlow: "0 0 25px rgba(212, 175, 55, 0.3)",
      blueGlow: "0 0 25px rgba(0, 227, 253, 0.3)",
    }
  }
};

/**
 * TAILWIND CONFIG EXTENSION
 * Copy this into the `theme.extend` section of your `tailwind.config.js`
 */
export const tailwindThemeExtension = {
  colors: {
    background: "#0A0A0B",
    surface: {
      DEFAULT: "#111415",
      dim: "#111415",
      bright: "#373a3b",
      variant: "#323536",
    },
    "surface-container": {
      lowest: "#0c0f10",
      low: "#191c1d",
      DEFAULT: "#1d2021",
      high: "#282a2b",
      highest: "#323536",
    },
    primary: {
      DEFAULT: "#f2ca50",
      container: "#d4af37",
    },
    secondary: {
      DEFAULT: "#bdf4ff",
      container: "#00e3fd",
    },
    on: {
      background: "#e1e3e4",
      surface: "#e1e3e4",
      primary: "#3c2f00",
      secondary: "#00363d",
    }
  },
  fontFamily: {
    headline: ["Anybody", "sans-serif"],
    body: ["Hanken Grotesk", "sans-serif"],
    mono: ["JetBrains Mono", "monospace"],
  },
  borderRadius: {
    lg: "0.5rem",
    xl: "0.75rem",
  },
  spacing: {
    "bento-gap": "20px",
    "container-max": "1440px",
  }
};
