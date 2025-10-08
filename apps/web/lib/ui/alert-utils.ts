export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

export interface AlertMessageParts {
  title: string;
  description: string;
}

/**
 * Generate alert title/description based on variant and state flags.
 */
export function formatAlertMessage(
  variant: AlertVariant,
  options: {
    loading?: boolean;
    active?: boolean;
    focused?: boolean;
    disabled?: boolean;
  } = {}
): AlertMessageParts {
  if (options.loading) {
    return {
      title: 'Processing...',
      description: 'System is processing your request...',
    };
  }
  if (options.disabled) {
    return {
      title: 'Disabled Alert',
      description: 'This alert is disabled and cannot be interacted with.',
    };
  }
  if (options.focused) {
    return {
      title: 'Focused State',
      description:
        'This alert has keyboard focus and is ready for interaction.',
    };
  }
  if (options.active) {
    return {
      title: 'Active Alert',
      description: 'This alert is currently active and highlighted.',
    };
  }

  switch (variant) {
    case 'destructive':
      return {
        title: 'Error',
        description: 'A critical error has occurred in the system.',
      };
    case 'warning':
      return {
        title: 'Warning',
        description: 'Please review the following warning message.',
      };
    case 'success':
      return {
        title: 'Success',
        description: 'Operation completed successfully.',
      };
    default:
      return {
        title: 'Information',
        description: 'This is an informational message for the user.',
      };
  }
}
