export type CardVariant = 'default' | 'panel' | 'window';

export interface CardLayoutOptions {
  hasHeader?: boolean;
  hasFooter?: boolean;
  bordered?: boolean;
  variant?: CardVariant;
}

/**
 * Compute utility class names for cards based on layout options.
 * Pure function for unit testing (no DOM).
 */
export function getCardLayoutClasses(
  options: CardLayoutOptions = {}
): string[] {
  const classes: string[] = [];

  if (options.bordered) {
    classes.push('terminal-border');
  } else {
    classes.push('border-2', 'border-dashed', 'border-border');
  }

  // Variant surface styles
  switch (options.variant) {
    case 'panel':
      classes.push('terminal-panel');
      break;
    case 'window':
      classes.push('terminal-window');
      break;
    default:
      classes.push('weathered-surface');
  }

  if (options.hasHeader) {
    classes.push('with-header');
  }
  if (options.hasFooter) {
    classes.push('with-footer');
  }

  return classes;
}
