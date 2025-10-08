import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant for different styling contexts
   */
  variant?: 'default' | 'terminal';
}

const InputDescription = React.forwardRef<
  HTMLDivElement,
  InputDescriptionProps
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-xs text-muted-foreground',
      variant === 'terminal' && 'font-mono',
      '[&_a]:underline [&_a]:hover:text-primary [&_a]:transition-colors',
      '[&_a]:text-current [&_a]:decoration-inherit',
      className
    )}
    {...props}
  />
));
InputDescription.displayName = 'InputDescription';

export { InputDescription };
