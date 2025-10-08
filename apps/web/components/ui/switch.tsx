'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      // Base styles
      'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center relative overflow-hidden ' +
        'border-2 border-solid font-mono focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ' +
        // Smooth animations
        'transition-all duration-300 ease-in-out ' +
        // Off state (inset, dark)
        'data-[state=unchecked]:bg-background data-[state=unchecked]:border-border data-[state=unchecked]:border-inset ' +
        'data-[state=unchecked]:shadow-inner ' +
        // On state (outset, glowing amber)
        'data-[state=checked]:bg-accent/20 data-[state=checked]:border-accent data-[state=checked]:border-outset ' +
        'data-[state=checked]:shadow-lg data-[state=checked]:shadow-accent/25 ' +
        // Focus states
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
        // Hover effects with ignite
        'hover:data-[state=unchecked]:bg-muted/50 hover:data-[state=checked]:bg-accent/30 ' +
        'terminal-ignite-border',
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Background glow effect for active state */}
    <div className="absolute inset-0 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent/10 data-[state=checked]:to-accent/5 data-[state=unchecked]:bg-transparent transition-all duration-300" />

    <SwitchPrimitive.Thumb
      className={cn(
        // Base thumb styles with proper spacing from edges
        'pointer-events-none block h-5 w-5 relative z-10 border-2 border-solid font-mono ' +
          // Smooth slide and scale animations
          'transition-all duration-300 ease-in-out ' +
          // Precise positioning - 1px margin from edges
          'data-[state=checked]:translate-x-[21px] data-[state=unchecked]:translate-x-[1px] ' +
          'data-[state=checked]:scale-110 data-[state=unchecked]:scale-100 ' +
          // Off state appearance (inset, subtle)
          'data-[state=unchecked]:bg-card data-[state=unchecked]:border-border data-[state=unchecked]:border-inset ' +
          'data-[state=unchecked]:shadow-inner ' +
          // On state appearance (outset, glowing)
          'data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:border-outset ' +
          'data-[state=checked]:shadow-lg data-[state=checked]:shadow-accent/50 ' +
          // Terminal grid texture
          'data-[state=checked]:bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_var(--color-accent)_50%,_transparent_50%)] ' +
          'data-[state=checked]:bg-[length:2px_2px]'
      )}
    >
      {/* Inner glow dot for active state */}
      <div className="absolute inset-1 rounded-full data-[state=checked]:bg-accent data-[state=checked]:animate-pulse data-[state=unchecked]:bg-transparent transition-all duration-300" />

      {/* Terminal-style indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 data-[state=checked]:bg-background data-[state=unchecked]:bg-muted-foreground transition-colors duration-200" />
      </div>
    </SwitchPrimitive.Thumb>
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
