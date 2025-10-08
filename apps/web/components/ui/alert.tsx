import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full font-mono transition-none pixel-surface flex overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-accent/10 text-foreground [&>svg]:text-accent alert-border-default',
        destructive:
          'bg-destructive/10 text-destructive ' +
          '[&>svg]:text-destructive alert-border-destructive',
        warning:
          'bg-accent/10 text-accent ' +
          '[&>svg]:text-accent alert-border-warning',
        success:
          'bg-success/10 text-success ' +
          '[&>svg]:text-success alert-border-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    variant?: 'default' | 'destructive' | 'warning' | 'success';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const getGlowClass = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive-glow';
      case 'success':
        return 'success-glow';
      case 'warning':
      case 'default':
      default:
        return 'amber-glow';
    }
  };

  return (
    <h5
      ref={ref}
      className={cn(
        'mb-1 font-mono font-bold leading-none tracking-tight',
        getGlowClass(),
        className
      )}
      {...props}
    />
  );
});
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm font-mono [&_p]:leading-relaxed flex-1', className)}
    {...props}
  />
));

const AlertIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive' | 'warning' | 'success';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'terminal-icon-sidebar',
      variant === 'destructive' && 'destructive',
      variant === 'success' && 'success',
      className
    )}
    {...props}
  />
));
AlertIcon.displayName = 'AlertIcon';

const AlertContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 p-4', className)} {...props} />
));
AlertContent.displayName = 'AlertContent';
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, AlertIcon, AlertContent };
