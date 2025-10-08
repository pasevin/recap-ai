import { test, expect, describe } from 'bun:test';
import {
  retroColors,
  hslToString,
  hexToHsl,
  generateRetroCssVariables,
  validateRetroColorPalette,
  withOpacity,
  lightenColor,
  darkenColor,
} from '../retro-colors';

describe('Retro Colors Utilities', () => {
  describe('retroColors palette', () => {
    test('has all required color groups', () => {
      expect(retroColors.amber).toBeDefined();
      expect(retroColors.terminal).toBeDefined();
      expect(retroColors.industrial).toBeDefined();
      expect(retroColors.rust).toBeDefined();
      expect(retroColors.neutral).toBeDefined();
    });

    test('each color group has all required shades', () => {
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

      Object.values(retroColors).forEach((colorGroup) => {
        requiredShades.forEach((shade) => {
          expect(
            colorGroup[shade as unknown as keyof typeof colorGroup]
          ).toBeDefined();
          expect(
            typeof colorGroup[shade as unknown as keyof typeof colorGroup]
          ).toBe('string');
        });
      });
    });

    test('primary amber color is correct', () => {
      expect(retroColors.amber[500]).toBe('#FFB000');
    });

    test('terminal green color is correct', () => {
      expect(retroColors.terminal[500]).toBe('#00FF00');
    });
  });

  describe('hslToString', () => {
    test('converts HSL values to string format', () => {
      expect(hslToString(45, 100, 50)).toBe('45 100% 50%');
      expect(hslToString(0, 0, 100)).toBe('0 0% 100%');
      expect(hslToString(360, 75, 25)).toBe('360 75% 25%');
    });
  });

  describe('hexToHsl', () => {
    test('converts hex colors to HSL values', () => {
      // Test white
      const white = hexToHsl('#FFFFFF');
      expect(white.h).toBe(0);
      expect(white.s).toBe(0);
      expect(white.l).toBe(100);

      // Test black
      const black = hexToHsl('#000000');
      expect(black.h).toBe(0);
      expect(black.s).toBe(0);
      expect(black.l).toBe(0);

      // Test red
      const red = hexToHsl('#FF0000');
      expect(red.h).toBe(0);
      expect(red.s).toBe(100);
      expect(red.l).toBe(50);
    });

    test('handles hex colors without # prefix', () => {
      const color1 = hexToHsl('#FF0000');
      const color2 = hexToHsl('FF0000');

      expect(color1).toEqual(color2);
    });

    test('converts primary amber color correctly', () => {
      const amber = hexToHsl(retroColors.amber[500]);
      expect(amber.h).toBeGreaterThanOrEqual(0);
      expect(amber.h).toBeLessThanOrEqual(360);
      expect(amber.s).toBeGreaterThan(0);
      expect(amber.l).toBeGreaterThan(0);
    });
  });

  describe('generateRetroCssVariables', () => {
    test('generates CSS variables for all color groups and shades', () => {
      const variables = generateRetroCssVariables();

      // Test that all color groups have variables
      expect(variables['--retro-amber-500']).toBeDefined();
      expect(variables['--retro-terminal-500']).toBeDefined();
      expect(variables['--retro-industrial-500']).toBeDefined();
      expect(variables['--retro-rust-500']).toBeDefined();
      expect(variables['--retro-neutral-500']).toBeDefined();
    });

    test('generates semantic color mappings', () => {
      const variables = generateRetroCssVariables();

      expect(variables['--primary']).toBeDefined();
      expect(variables['--primary-foreground']).toBeDefined();
      expect(variables['--secondary']).toBeDefined();
      expect(variables['--destructive']).toBeDefined();
      expect(variables['--background']).toBeDefined();
      expect(variables['--foreground']).toBeDefined();
      expect(variables['--muted']).toBeDefined();
    });

    test('all variables are in HSL format', () => {
      const variables = generateRetroCssVariables();

      Object.values(variables).forEach((value) => {
        // HSL format should be "h s% l%" (e.g., "45 100% 50%")
        expect(value).toMatch(/^\d+ \d+% \d+%$/);
      });
    });
  });

  describe('validateRetroColorPalette', () => {
    test('validates correct color palette', () => {
      expect(validateRetroColorPalette(retroColors)).toBe(true);
    });

    test('rejects invalid palette structures', () => {
      expect(validateRetroColorPalette(null)).toBe(false);
      expect(validateRetroColorPalette(undefined)).toBe(false);
      expect(validateRetroColorPalette({})).toBe(false);
      expect(validateRetroColorPalette('not an object')).toBe(false);
    });

    test('rejects palette missing required color groups', () => {
      const incompletepalette = {
        amber: retroColors.amber,
        terminal: retroColors.terminal,
        // Missing industrial, rust, neutral
      };
      expect(validateRetroColorPalette(incompletepalette)).toBe(false);
    });

    test('rejects palette with missing shades', () => {
      const paletteWithMissingShades = {
        ...retroColors,
        amber: {
          500: '#FFB000',
          // Missing other shades
        },
      };
      expect(validateRetroColorPalette(paletteWithMissingShades)).toBe(false);
    });

    test('rejects palette with invalid hex colors', () => {
      const paletteWithInvalidHex = {
        ...retroColors,
        amber: {
          ...retroColors.amber,
          500: 'not-a-hex-color',
        },
      };
      expect(validateRetroColorPalette(paletteWithInvalidHex)).toBe(false);
    });
  });

  describe('withOpacity', () => {
    test('adds opacity to HSL color string', () => {
      expect(withOpacity('45 100% 50%', 0.5)).toBe('hsla(45 100% 50%, 0.5)');
      expect(withOpacity('0 0% 100%', 1)).toBe('hsla(0 0% 100%, 1)');
      expect(withOpacity('120 75% 25%', 0.1)).toBe('hsla(120 75% 25%, 0.1)');
    });
  });

  describe('lightenColor', () => {
    test('increases lightness value', () => {
      const result = lightenColor(45, 100, 50, 10);
      expect(result.h).toBe(45);
      expect(result.s).toBe(100);
      expect(result.l).toBe(60);
    });

    test('caps lightness at 100', () => {
      const result = lightenColor(45, 100, 95, 10);
      expect(result.l).toBe(100);
    });

    test('does not modify hue and saturation', () => {
      const result = lightenColor(180, 50, 30, 20);
      expect(result.h).toBe(180);
      expect(result.s).toBe(50);
    });
  });

  describe('darkenColor', () => {
    test('decreases lightness value', () => {
      const result = darkenColor(45, 100, 50, 10);
      expect(result.h).toBe(45);
      expect(result.s).toBe(100);
      expect(result.l).toBe(40);
    });

    test('caps lightness at 0', () => {
      const result = darkenColor(45, 100, 5, 10);
      expect(result.l).toBe(0);
    });

    test('does not modify hue and saturation', () => {
      const result = darkenColor(180, 50, 70, 20);
      expect(result.h).toBe(180);
      expect(result.s).toBe(50);
    });
  });

  describe('Color palette integration', () => {
    test('primary amber converts to valid HSL', () => {
      const amber = hexToHsl(retroColors.amber[500]);
      const hslString = hslToString(amber.h, amber.s, amber.l);

      expect(hslString).toMatch(/^\d+ \d+% \d+%$/);
    });

    test('terminal green maintains vibrancy in HSL conversion', () => {
      const terminal = hexToHsl(retroColors.terminal[500]);

      // Terminal green should be highly saturated and moderately bright
      expect(terminal.s).toBeGreaterThan(90);
      expect(terminal.l).toBeGreaterThan(40);
    });

    test('industrial colors maintain earthiness', () => {
      const industrial = hexToHsl(retroColors.industrial[500]);

      // Industrial browns should have lower lightness
      expect(industrial.l).toBeLessThan(50);
    });
  });
});
