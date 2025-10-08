/**
 * Utilities for the design preview component showcase
 * Handles component state management, comparison modes, and display logic
 */

export interface ComponentState {
  name: string;
  variant?: string;
  size?: string;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  hovered?: boolean;
  focused?: boolean;
}

export interface ComponentShowcaseItem {
  id: string;
  name: string;
  category:
    | 'buttons'
    | 'inputs'
    | 'cards'
    | 'navigation'
    | 'feedback'
    | 'layout'
    | 'forms';
  description: string;
  states: ComponentState[];
  hasInteractiveDemo: boolean;
}

export type ComparisonMode = 'side-by-side' | 'overlay' | 'tabbed';
export type ViewMode = 'all' | 'original' | 'transformed';

/**
 * Generate all possible component states for comprehensive testing
 */
export function generateComponentStates(
  baseState: Omit<ComponentState, 'name'>
): ComponentState[] {
  const variations = [
    { name: 'Default' },
    { name: 'Hovered', hovered: true },
    { name: 'Focused', focused: true },
    { name: 'Active', active: true },
    { name: 'Disabled', disabled: true },
    { name: 'Loading', loading: true },
  ];

  return variations.map((variation) => ({
    ...baseState,
    ...variation,
  }));
}

/**
 * Filter showcase items by category
 */
export function filterShowcaseByCategory(
  items: ComponentShowcaseItem[],
  category?: string
): ComponentShowcaseItem[] {
  if (!category || category === 'all') {
    return items;
  }

  return items.filter((item) => item.category === category);
}

/**
 * Group showcase items by category for organized display
 */
export function groupShowcaseByCategory(
  items: ComponentShowcaseItem[]
): Record<string, ComponentShowcaseItem[]> {
  return items.reduce(
    (groups, item) => {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    },
    {} as Record<string, ComponentShowcaseItem[]>
  );
}

/**
 * Validate component showcase item structure
 */
export function validateShowcaseItem(
  item: unknown
): item is ComponentShowcaseItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const itemObj = item as Record<string, unknown>;

  const requiredFields = [
    'id',
    'name',
    'category',
    'description',
    'states',
    'hasInteractiveDemo',
  ];

  for (const field of requiredFields) {
    if (!(field in item)) {
      return false;
    }
  }

  // Validate category
  const validCategories = [
    'buttons',
    'inputs',
    'cards',
    'navigation',
    'feedback',
    'layout',
    'forms',
  ];
  if (!validCategories.includes(itemObj.category as string)) {
    return false;
  }

  // Validate states array
  if (!Array.isArray(itemObj.states)) {
    return false;
  }

  // Validate each state
  for (const state of itemObj.states as unknown[]) {
    const stateObj = state as Record<string, unknown>;
    if (!stateObj.name || typeof stateObj.name !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Generate CSS class name for component state
 */
export function getStateClassNames(state: ComponentState): string[] {
  const classNames: string[] = [];

  if (state.variant) {
    classNames.push(`variant-${state.variant}`);
  }

  if (state.size) {
    classNames.push(`size-${state.size}`);
  }

  if (state.disabled) {
    classNames.push('disabled');
  }

  if (state.loading) {
    classNames.push('loading');
  }

  if (state.active) {
    classNames.push('active');
  }

  // Note: hover and focus states are handled via CSS pseudo-classes

  return classNames;
}

/**
 * Create unique identifier for component state
 */
export function createStateId(
  componentId: string,
  state: ComponentState
): string {
  const stateKey = [
    state.name,
    state.variant,
    state.size,
    state.disabled ? 'disabled' : null,
    state.loading ? 'loading' : null,
    state.active ? 'active' : null,
  ]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/\s+/g, '-');

  return `${componentId}-${stateKey}`;
}

/**
 * Generate responsive breakpoints for component comparison
 */
export function getResponsiveBreakpoints() {
  return {
    mobile: { width: 375, label: 'Mobile' },
    tablet: { width: 768, label: 'Tablet' },
    desktop: { width: 1200, label: 'Desktop' },
    wide: { width: 1920, label: 'Wide' },
  };
}

/**
 * Check if comparison mode is valid
 */
export function isValidComparisonMode(mode: string): mode is ComparisonMode {
  return ['side-by-side', 'overlay', 'tabbed'].includes(mode);
}

/**
 * Check if view mode is valid
 */
export function isValidViewMode(mode: string): mode is ViewMode {
  return ['all', 'original', 'transformed'].includes(mode);
}

/**
 * Generate demo data for component showcase
 */
export function generateShowcaseData(): ComponentShowcaseItem[] {
  return [
    {
      id: 'wizard-welcome',
      name: 'Wizard Welcome',
      category: 'layout',
      description: 'Setup wizard welcome screen with terminal styling',
      states: generateComponentStates({}),
      hasInteractiveDemo: false,
    },
    {
      id: 'button',
      name: 'Button',
      category: 'buttons',
      description: 'Primary action buttons with retro terminal styling',
      states: generateComponentStates({ variant: 'default', size: 'default' }),
      hasInteractiveDemo: true,
    },
    {
      id: 'input',
      name: 'Input',
      category: 'inputs',
      description: 'Text input with monospace font and terminal cursor effects',
      states: generateComponentStates({ variant: 'default' }),
      hasInteractiveDemo: true,
    },
    {
      id: 'card',
      name: 'Card',
      category: 'cards',
      description:
        'Container with terminal screen aesthetics and corner decorations',
      states: generateComponentStates({}),
      hasInteractiveDemo: false,
    },
    {
      id: 'tabs',
      name: 'Tabs',
      category: 'navigation',
      description:
        'Tab navigation with inset/outset states and amber glow effects',
      states: generateComponentStates({}),
      hasInteractiveDemo: true,
    },
    {
      id: 'alert',
      name: 'Alert',
      category: 'feedback',
      description: 'Status messages with retro-futuristic styling',
      states: [
        { name: 'Default', variant: 'default' },
        { name: 'Hovered', variant: 'default', hovered: true },
        { name: 'Focused', variant: 'default', focused: true },
        { name: 'Active', variant: 'default', active: true },
        { name: 'Disabled', variant: 'default', disabled: true },
        { name: 'Loading', variant: 'default', loading: true },
        { name: 'Warning', variant: 'warning' },
        { name: 'Error', variant: 'destructive' },
        { name: 'Success', variant: 'success' },
      ],
      hasInteractiveDemo: true,
    },
    {
      id: 'checkbox',
      name: 'Checkbox',
      category: 'forms',
      description: 'Terminal-styled checkboxes with amber glow effects',
      states: [
        { name: 'Unchecked' },
        { name: 'Checked', active: true },
        { name: 'Hovered', hovered: true },
        { name: 'Focused', focused: true },
        { name: 'Disabled', disabled: true },
        { name: 'Checked + Disabled', active: true, disabled: true },
      ],
      hasInteractiveDemo: true,
    },
    {
      id: 'accordion',
      name: 'Accordion',
      category: 'layout',
      description:
        'Collapsible content sections with terminal navigation styling',
      states: [
        { name: 'Default' },
        { name: 'Expanded', active: true },
        { name: 'Hovered', hovered: true },
        { name: 'Multiple Items' },
        { name: 'Disabled', disabled: true },
      ],
      hasInteractiveDemo: true,
    },
    {
      id: 'radio-group',
      name: 'Radio Group',
      category: 'forms',
      description: 'Terminal-styled radio buttons with amber accent indicator',
      states: [
        { name: 'Default' },
        { name: 'Focused', focused: true },
        { name: 'Disabled', disabled: true },
      ],
      hasInteractiveDemo: true,
    },
  ];
}
