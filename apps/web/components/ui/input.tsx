import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full border-2 border-inset border-border bg-background px-2 py-1 text-sm font-mono text-foreground subtle-scanlines ' +
            'file:border-0 file:bg-transparent file:text-sm file:font-mono file:text-foreground ' +
            'placeholder:text-terminal-dim placeholder:font-mono ' +
            'focus:outline-none focus:border-2 focus:border-inset focus:border-ring focus:bg-card terminal-ignite-subtle ' +
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted ' +
            'transition-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
