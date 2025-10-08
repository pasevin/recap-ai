import { test, expect, describe } from 'bun:test';
import {
  ComponentState,
  ComponentShowcaseItem,
  generateComponentStates,
  filterShowcaseByCategory,
  groupShowcaseByCategory,
  validateShowcaseItem,
  getStateClassNames,
  createStateId,
  getResponsiveBreakpoints,
  isValidComparisonMode,
  isValidViewMode,
  generateShowcaseData,
} from '../showcase';

describe('Showcase Utilities', () => {
  describe('generateComponentStates', () => {
    test('generates all basic component states', () => {
      const baseState = { variant: 'default', size: 'medium' };
      const states = generateComponentStates(baseState);

      expect(states).toHaveLength(6);

      const stateNames = states.map((s) => s.name);
      expect(stateNames).toContain('Default');
      expect(stateNames).toContain('Hovered');
      expect(stateNames).toContain('Focused');
      expect(stateNames).toContain('Active');
      expect(stateNames).toContain('Disabled');
      expect(stateNames).toContain('Loading');
    });

    test('preserves base state properties in all variations', () => {
      const baseState = { variant: 'primary', size: 'large' };
      const states = generateComponentStates(baseState);

      states.forEach((state) => {
        expect(state.variant).toBe('primary');
        expect(state.size).toBe('large');
      });
    });

    test('correctly applies state-specific properties', () => {
      const states = generateComponentStates({});

      const hoveredState = states.find((s) => s.name === 'Hovered');
      expect(hoveredState?.hovered).toBe(true);

      const disabledState = states.find((s) => s.name === 'Disabled');
      expect(disabledState?.disabled).toBe(true);

      const loadingState = states.find((s) => s.name === 'Loading');
      expect(loadingState?.loading).toBe(true);
    });
  });

  describe('filterShowcaseByCategory', () => {
    const mockItems: ComponentShowcaseItem[] = [
      {
        id: 'button',
        name: 'Button',
        category: 'buttons',
        description: 'Test button',
        states: [],
        hasInteractiveDemo: true,
      },
      {
        id: 'input',
        name: 'Input',
        category: 'inputs',
        description: 'Test input',
        states: [],
        hasInteractiveDemo: true,
      },
      {
        id: 'card',
        name: 'Card',
        category: 'cards',
        description: 'Test card',
        states: [],
        hasInteractiveDemo: false,
      },
    ];

    test('returns all items when no category specified', () => {
      const result = filterShowcaseByCategory(mockItems);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockItems);
    });

    test('returns all items when category is "all"', () => {
      const result = filterShowcaseByCategory(mockItems, 'all');
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockItems);
    });

    test('filters items by specific category', () => {
      const result = filterShowcaseByCategory(mockItems, 'buttons');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('buttons');
      expect(result[0].name).toBe('Button');
    });

    test('returns empty array for non-existent category', () => {
      const result = filterShowcaseByCategory(mockItems, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('groupShowcaseByCategory', () => {
    const mockItems: ComponentShowcaseItem[] = [
      {
        id: 'button1',
        name: 'Button Primary',
        category: 'buttons',
        description: 'Primary button',
        states: [],
        hasInteractiveDemo: true,
      },
      {
        id: 'button2',
        name: 'Button Secondary',
        category: 'buttons',
        description: 'Secondary button',
        states: [],
        hasInteractiveDemo: true,
      },
      {
        id: 'input',
        name: 'Input',
        category: 'inputs',
        description: 'Test input',
        states: [],
        hasInteractiveDemo: true,
      },
    ];

    test('groups items by category correctly', () => {
      const result = groupShowcaseByCategory(mockItems);

      expect(Object.keys(result)).toContain('buttons');
      expect(Object.keys(result)).toContain('inputs');

      expect(result.buttons).toHaveLength(2);
      expect(result.inputs).toHaveLength(1);
    });

    test('handles empty array', () => {
      const result = groupShowcaseByCategory([]);
      expect(result).toEqual({});
    });

    test('preserves item structure within groups', () => {
      const result = groupShowcaseByCategory(mockItems);

      expect(result.buttons[0]).toEqual(mockItems[0]);
      expect(result.buttons[1]).toEqual(mockItems[1]);
      expect(result.inputs[0]).toEqual(mockItems[2]);
    });
  });

  describe('validateShowcaseItem', () => {
    const validItem: ComponentShowcaseItem = {
      id: 'test',
      name: 'Test Component',
      category: 'buttons',
      description: 'Test description',
      states: [{ name: 'Default' }],
      hasInteractiveDemo: true,
    };

    test('validates correct showcase item', () => {
      expect(validateShowcaseItem(validItem)).toBe(true);
    });

    test('rejects null or undefined', () => {
      expect(validateShowcaseItem(null)).toBe(false);
      expect(validateShowcaseItem(undefined)).toBe(false);
    });

    test('rejects non-object types', () => {
      expect(validateShowcaseItem('string')).toBe(false);
      expect(validateShowcaseItem(123)).toBe(false);
      expect(validateShowcaseItem(true)).toBe(false);
    });

    test('rejects items missing required fields', () => {
      const { id, ...withoutId } = validItem;
      expect(validateShowcaseItem(withoutId)).toBe(false);

      const { name, ...withoutName } = validItem;
      expect(validateShowcaseItem(withoutName)).toBe(false);

      const { states, ...withoutStates } = validItem;
      expect(validateShowcaseItem(withoutStates)).toBe(false);
    });

    test('rejects invalid category', () => {
      const invalidCategory = { ...validItem, category: 'invalid' };
      expect(validateShowcaseItem(invalidCategory)).toBe(false);
    });

    test('rejects non-array states', () => {
      const invalidStates = { ...validItem, states: 'not-array' };
      expect(validateShowcaseItem(invalidStates)).toBe(false);
    });

    test('rejects states without name', () => {
      const invalidStateNames = {
        ...validItem,
        states: [{ variant: 'primary' }], // missing name
      };
      expect(validateShowcaseItem(invalidStateNames)).toBe(false);
    });

    test('accepts all valid categories', () => {
      const categories = [
        'buttons',
        'inputs',
        'cards',
        'navigation',
        'feedback',
        'layout',
      ];

      categories.forEach((category) => {
        const item = { ...validItem, category };
        expect(validateShowcaseItem(item)).toBe(true);
      });
    });
  });

  describe('getStateClassNames', () => {
    test('returns empty array for basic state', () => {
      const state: ComponentState = { name: 'Default' };
      const classNames = getStateClassNames(state);
      expect(classNames).toEqual([]);
    });

    test('includes variant class when specified', () => {
      const state: ComponentState = { name: 'Default', variant: 'primary' };
      const classNames = getStateClassNames(state);
      expect(classNames).toContain('variant-primary');
    });

    test('includes size class when specified', () => {
      const state: ComponentState = { name: 'Default', size: 'large' };
      const classNames = getStateClassNames(state);
      expect(classNames).toContain('size-large');
    });

    test('includes state flags when active', () => {
      const state: ComponentState = {
        name: 'Complex',
        disabled: true,
        loading: true,
        active: true,
      };
      const classNames = getStateClassNames(state);

      expect(classNames).toContain('disabled');
      expect(classNames).toContain('loading');
      expect(classNames).toContain('active');
    });

    test('combines all class types', () => {
      const state: ComponentState = {
        name: 'All States',
        variant: 'secondary',
        size: 'small',
        disabled: true,
        loading: true,
        active: true,
      };
      const classNames = getStateClassNames(state);

      expect(classNames).toContain('variant-secondary');
      expect(classNames).toContain('size-small');
      expect(classNames).toContain('disabled');
      expect(classNames).toContain('loading');
      expect(classNames).toContain('active');
    });
  });

  describe('createStateId', () => {
    test('creates basic state ID', () => {
      const state: ComponentState = { name: 'Default' };
      const id = createStateId('button', state);
      expect(id).toBe('button-default');
    });

    test('includes variant and size in ID', () => {
      const state: ComponentState = {
        name: 'Primary Large',
        variant: 'primary',
        size: 'large',
      };
      const id = createStateId('button', state);
      expect(id).toBe('button-primary-large-primary-large');
    });

    test('includes state flags in ID', () => {
      const state: ComponentState = {
        name: 'Disabled Loading',
        disabled: true,
        loading: true,
      };
      const id = createStateId('input', state);
      expect(id).toBe('input-disabled-loading-disabled-loading');
    });

    test('normalizes spaces and cases', () => {
      const state: ComponentState = { name: 'Complex State Name' };
      const id = createStateId('component', state);
      expect(id).toBe('component-complex-state-name');
    });

    test('filters out null/undefined values', () => {
      const state: ComponentState = {
        name: 'Mixed',
        variant: 'primary',
        size: undefined,
        disabled: false,
        loading: true,
        active: false,
      };
      const id = createStateId('test', state);
      expect(id).toBe('test-mixed-primary-loading');
    });
  });

  describe('getResponsiveBreakpoints', () => {
    test('returns correct breakpoint structure', () => {
      const breakpoints = getResponsiveBreakpoints();

      expect(breakpoints).toHaveProperty('mobile');
      expect(breakpoints).toHaveProperty('tablet');
      expect(breakpoints).toHaveProperty('desktop');
      expect(breakpoints).toHaveProperty('wide');
    });

    test('breakpoints have correct properties', () => {
      const breakpoints = getResponsiveBreakpoints();

      Object.values(breakpoints).forEach((bp) => {
        expect(bp).toHaveProperty('width');
        expect(bp).toHaveProperty('label');
        expect(typeof bp.width).toBe('number');
        expect(typeof bp.label).toBe('string');
      });
    });

    test('breakpoints are in ascending width order', () => {
      const breakpoints = getResponsiveBreakpoints();
      const widths = Object.values(breakpoints).map((bp) => bp.width);

      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });
  });

  describe('isValidComparisonMode', () => {
    test('validates correct comparison modes', () => {
      expect(isValidComparisonMode('side-by-side')).toBe(true);
      expect(isValidComparisonMode('overlay')).toBe(true);
      expect(isValidComparisonMode('tabbed')).toBe(true);
    });

    test('rejects invalid comparison modes', () => {
      expect(isValidComparisonMode('invalid')).toBe(false);
      expect(isValidComparisonMode('')).toBe(false);
      expect(isValidComparisonMode('side by side')).toBe(false);
    });
  });

  describe('isValidViewMode', () => {
    test('validates correct view modes', () => {
      expect(isValidViewMode('all')).toBe(true);
      expect(isValidViewMode('original')).toBe(true);
      expect(isValidViewMode('transformed')).toBe(true);
    });

    test('rejects invalid view modes', () => {
      expect(isValidViewMode('invalid')).toBe(false);
      expect(isValidViewMode('')).toBe(false);
      expect(isValidViewMode('both')).toBe(false);
    });
  });

  describe('generateShowcaseData', () => {
    test('generates array of showcase items', () => {
      const data = generateShowcaseData();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('all generated items are valid', () => {
      const data = generateShowcaseData();

      data.forEach((item) => {
        expect(validateShowcaseItem(item)).toBe(true);
      });
    });

    test('covers different component categories', () => {
      const data = generateShowcaseData();
      const categories = data.map((item) => item.category);

      expect(categories).toContain('buttons');
      expect(categories).toContain('inputs');
      expect(categories).toContain('cards');
      expect(categories).toContain('feedback');
      expect(categories).toContain('navigation');
    });

    test('each item has required states', () => {
      const data = generateShowcaseData();

      data.forEach((item) => {
        expect(Array.isArray(item.states)).toBe(true);
        expect(item.states.length).toBeGreaterThan(0);

        item.states.forEach((state) => {
          expect(state.name).toBeDefined();
          expect(typeof state.name).toBe('string');
        });
      });
    });
  });

  describe('Integration tests', () => {
    test('showcase data works with filtering functions', () => {
      const data = generateShowcaseData();

      // Test filtering
      const buttonItems = filterShowcaseByCategory(data, 'buttons');
      expect(buttonItems.length).toBeGreaterThan(0);
      buttonItems.forEach((item) => {
        expect(item.category).toBe('buttons');
      });

      // Test grouping
      const grouped = groupShowcaseByCategory(data);
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });

    test('state generation works with state utilities', () => {
      const states = generateComponentStates({ variant: 'primary' });

      states.forEach((state) => {
        const classNames = getStateClassNames(state);
        const stateId = createStateId('test', state);

        expect(Array.isArray(classNames)).toBe(true);
        expect(typeof stateId).toBe('string');
        expect(stateId.length).toBeGreaterThan(0);
      });
    });
  });
});
