/**
 * Retro-futuristic color palette and utilities
 * Provides amber-dominant colors with industrial accents
 */

// Primary retro-futuristic color palette
export const retroColors = {
  // Amber spectrum (primary)
  amber: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFB000', // Primary amber
    600: '#FFA000',
    700: '#FF8F00',
    800: '#FF6F00',
    900: '#E65100',
  },

  // Terminal green (accent)
  terminal: {
    50: '#E8F5E8',
    100: '#C8E6C8',
    200: '#A4D4A4',
    300: '#81C784',
    400: '#66BB6A',
    500: '#00FF00', // Terminal green
    600: '#00E600',
    700: '#00CC00',
    800: '#00B300',
    900: '#009900',
  },

  // Industrial spectrum (backgrounds, borders)
  industrial: {
    50: '#F5F5DC',
    100: '#E6E6CA',
    200: '#D4D4AA',
    300: '#C2C28A',
    400: '#B0B070',
    500: '#8B4513', // Weathered brown
    600: '#7A3D10',
    700: '#69350E',
    800: '#582D0C',
    900: '#472509',
  },

  // Rust orange (warnings, destructive)
  rust: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#CC5500', // Rust orange
    600: '#B84C00',
    700: '#A34300',
    800: '#8F3A00',
    900: '#7A3100',
  },

  // Neutral grays (text, muted elements)
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
} as const;

/**
 * Convert HSL values to HSL string format
 */
export function hslToString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

/**
 * Convert hex color to HSL values
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Generate CSS custom properties for retro theme
 */
export function generateRetroCssVariables(): Record<string, string> {
  const variables: Record<string, string> = {};

  // Convert retro colors to HSL format for CSS variables
  Object.entries(retroColors).forEach(([colorName, colorShades]) => {
    Object.entries(colorShades).forEach(([shade, hexValue]) => {
      const hsl = hexToHsl(hexValue);
      variables[`--retro-${colorName}-${shade}`] = hslToString(
        hsl.h,
        hsl.s,
        hsl.l
      );
    });
  });

  // Add semantic color mappings
  const primaryAmber = hexToHsl(retroColors.amber[500]);
  const terminalGreen = hexToHsl(retroColors.terminal[500]);
  const rustOrange = hexToHsl(retroColors.rust[500]);
  const darkIndustrial = hexToHsl(retroColors.industrial[800]);
  const lightNeutral = hexToHsl(retroColors.neutral[100]);

  variables['--primary'] = hslToString(
    primaryAmber.h,
    primaryAmber.s,
    primaryAmber.l
  );
  variables['--primary-foreground'] = hslToString(
    darkIndustrial.h,
    darkIndustrial.s,
    darkIndustrial.l
  );
  variables['--secondary'] = hslToString(
    terminalGreen.h,
    terminalGreen.s,
    terminalGreen.l
  );
  variables['--destructive'] = hslToString(
    rustOrange.h,
    rustOrange.s,
    rustOrange.l
  );
  variables['--background'] = hslToString(
    darkIndustrial.h,
    darkIndustrial.s,
    darkIndustrial.l
  );
  variables['--foreground'] = hslToString(
    primaryAmber.h,
    primaryAmber.s,
    primaryAmber.l
  );
  variables['--muted'] = hslToString(
    lightNeutral.h,
    lightNeutral.s,
    lightNeutral.l
  );

  return variables;
}

/**
 * Validate if a color object has the correct retro theme structure
 */
export function validateRetroColorPalette(palette: unknown): boolean {
  if (!palette || typeof palette !== 'object') {
    return false;
  }

  const paletteObj = palette as Record<string, unknown>;

  const requiredColorGroups = [
    'amber',
    'terminal',
    'industrial',
    'rust',
    'neutral',
  ];
  const requiredShades = [
    '50',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
  ];

  for (const colorGroup of requiredColorGroups) {
    if (!paletteObj[colorGroup] || typeof paletteObj[colorGroup] !== 'object') {
      return false;
    }

    const colorGroupObj = paletteObj[colorGroup] as Record<string, unknown>;
    for (const shade of requiredShades) {
      if (!colorGroupObj[shade] || typeof colorGroupObj[shade] !== 'string') {
        return false;
      }

      // Validate hex color format
      const hexPattern = /^#[0-9A-F]{6}$/i;
      if (!hexPattern.test(colorGroupObj[shade] as string)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create a color with opacity
 */
export function withOpacity(colorHsl: string, opacity: number): string {
  return `hsla(${colorHsl}, ${opacity})`;
}

/**
 * Generate lighter variant of a color
 */
export function lightenColor(
  h: number,
  s: number,
  l: number,
  amount: number
): { h: number; s: number; l: number } {
  return {
    h,
    s,
    l: Math.min(100, l + amount),
  };
}

/**
 * Generate darker variant of a color
 */
export function darkenColor(
  h: number,
  s: number,
  l: number,
  amount: number
): { h: number; s: number; l: number } {
  return {
    h,
    s,
    l: Math.max(0, l - amount),
  };
}
