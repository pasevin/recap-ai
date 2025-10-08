'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b-2 border-dotted border-border', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 px-4 font-mono font-bold text-accent ' +
          'transition-all duration-200 cursor-pointer terminal-ignite-subtle ' +
          'hover:text-white focus-visible:outline-none focus-visible:text-white ' +
          '[&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:text-accent ' +
          '[&[data-state=open]]:border-2 [&[data-state=open]]:border-solid [&[data-state=open]]:border-accent ' +
          '[&[data-state=open]]:border-b-0 [&[data-state=open]]:bg-accent/10 ' +
          'border-0 outline-0',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-300 amber-glow" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm font-mono will-change-[height] data-[state=closed]:animate-[accordion-up_0.3s_ease-out_forwards] data-[state=open]:animate-[accordion-down_0.3s_ease-out_forwards]"
    {...props}
  >
    <div
      className={cn(
        'pb-4 pt-2 px-8 border-2 border-solid border-accent border-t-0 bg-accent/5 text-foreground pixel-surface',
        className
      )}
    >
      {children}
    </div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
