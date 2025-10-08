'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Terminal container styling
      'inline-flex items-center justify-start font-mono min-h-[48px] ' +
        'border-2 border-dashed border-border bg-card p-1 text-muted-foreground pixel-surface ' +
        'transition-all duration-200 ' +
        // Terminal panel effect
        'shadow-inner',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base terminal tab styling
      'inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-mono font-bold ' +
        'border-2 border-solid border-border bg-background text-muted-foreground ' +
        'transition-all duration-200 ease-in-out ' +
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ' +
        // Inactive state (inset, subtle)
        'data-[state=inactive]:border-inset data-[state=inactive]:bg-muted/50 terminal-ignite-subtle ' +
        'data-[state=inactive]:hover:text-white ' +
        // Active state (outset, glowing)
        'data-[state=active]:border-outset data-[state=active]:bg-accent/20 ' +
        'data-[state=active]:text-accent data-[state=active]:border-accent ' +
        'data-[state=active]:shadow-lg data-[state=active]:shadow-accent/25 ' +
        // Focus ring
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ' +
        // Hover effects for active tabs
        'data-[state=active]:hover:bg-accent/30 data-[state=active]:hover:shadow-accent/40 ' +
        'data-[state=active]:hover:border-accent data-[state=active]:hover:shadow-lg',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Terminal content area styling
      'mt-3 p-4 font-mono text-foreground ' +
        'border-2 border-dotted border-border bg-background ' +
        'transition-all duration-300 ease-in-out ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ' +
        // Content appears with fade-in
        'animate-in fade-in-50 duration-200',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
