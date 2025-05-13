export const colors = {
  primary: "#6B46C1", // Purple for trust
  secondary: "#38B2AC", // Teal for cleanliness
  background: {
    primary: "#FFFFFF",
    secondary: "#F7FAFC",
  },
  text: {
    primary: "#1A202C",
    secondary: "#4A5568",
    light: "#A0AEC0",
  },
  status: {
    success: "#48BB78",
    error: "#E53E3E",
    warning: "#ECC94B",
    info: "#4299E1",
  },
  border: {
    light: "#E2E8F0",
    medium: "#CBD5E0",
    dark: "#A0AEC0",
  },
  rating: {
    filled: "#F6E05E",
    empty: "#EDF2F7",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
