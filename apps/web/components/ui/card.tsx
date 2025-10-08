import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-2 border-dashed border-border bg-card text-card-foreground font-mono',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-card-header
    className={cn(
      'flex flex-col space-y-1 p-3 bg-accent/10 font-mono pixel-surface border-b-2 !border-dotted !border-border',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-sm font-bold leading-none tracking-wide font-mono text-accent uppercase amber-glow',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-muted-foreground font-mono', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const hasContent =
    React.Children.count(children) > 0 ||
    (typeof children === 'string' && children.trim().length > 0);

  return (
    <div
      ref={ref}
      data-card-content
      className={cn(
        'font-mono text-sm',
        hasContent ? 'p-3' : 'h-0 p-0 border-none overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const hasContent =
    React.Children.count(children) > 0 ||
    (typeof children === 'string' && children.trim().length > 0);

  return (
    <div
      ref={ref}
      data-card-footer
      className={cn(
        'flex items-center font-mono text-xs border-t-2 border-dotted border-border',
        hasContent ? 'p-3' : 'h-0 p-0 border-none overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
