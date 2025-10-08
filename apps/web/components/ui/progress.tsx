'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-3 sm:h-4 w-full overflow-hidden bg-black/80 font-mono ' +
        'shadow-[inset_0_0_10px_rgba(0,0,0,0.8),0_0_5px_var(--color-accent)] ' +
        'transition-none',
      className
    )}
    {...props}
  >
    {/* Terminal grid background */}
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `
          linear-gradient(90deg, var(--color-accent) 1px, transparent 1px),
          linear-gradient(0deg, var(--color-accent) 1px, transparent 1px)
        `,
        backgroundSize: '8px 2px',
      }}
    />

    {/* Horizontal scan lines */}
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 1px, var(--color-accent) 1px, var(--color-accent) 2px)`,
      }}
    />

    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 transition-all duration-700 ease-out ' +
          'bg-gradient-to-r from-accent/90 via-accent to-accent/70 ' +
          'relative overflow-hidden shadow-[0_0_10px_var(--color-accent)]'
      )}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    >
      {/* Bright leading edge */}
      <div className="absolute right-0 top-0 w-1 h-full bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse" />

      {/* Flowing energy effect */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 191, 0, 0.3) 25%, 
            rgba(255, 191, 0, 0.8) 50%, 
            rgba(255, 191, 0, 0.3) 75%, 
            transparent 100%)`,
          backgroundSize: '40px 100%',
          animation: 'terminal-flow 1.5s linear infinite',
        }}
      />

      {/* Pixel blocks effect */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, 
            var(--color-accent) 0px, 
            var(--color-accent) 2px, 
            transparent 2px, 
            transparent 4px)`,
          animation: 'pixel-march 0.8s linear infinite',
        }}
      />

      {/* Glitch effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)`,
          backgroundSize: '3px 100%',
          animation: 'terminal-glitch 3s ease-in-out infinite',
        }}
      />
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
