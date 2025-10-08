import { cva, type VariantProps } from 'class-variance-authority';

// Centralized button variant definitions for reuse and testing
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono font-normal cursor-pointer select-none focus:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground ' +
          'border-2 border-solid border-primary terminal-ignite-border ' +
          'hover:bg-primary/90 hover:text-primary-foreground ' +
          'active:bg-primary/80 active:border-2 active:border-inset active:border-primary',
        destructive:
          'bg-destructive text-destructive-foreground ' +
          'border-2 border-solid border-destructive ' +
          'hover:bg-red-700 hover:border-2 hover:border-inset hover:border-destructive ' +
          'active:bg-red-700 active:border-2 active:border-inset active:border-destructive',
        outline:
          'bg-background text-foreground ' +
          'border-2 border-dashed border-border terminal-ignite-subtle ' +
          'hover:text-white hover:border-solid ' +
          'active:bg-card active:border-inset active:border-border',
        secondary:
          'bg-muted text-muted-foreground ' +
          'border-2 border-dotted border-border terminal-ignite-border ' +
          'hover:text-white hover:border-solid ' +
          'active:bg-secondary active:border-inset active:border-border',
        ghost:
          'bg-transparent text-foreground border-2 border-transparent terminal-ignite-subtle ' +
          'hover:text-white hover:border-dashed ' +
          'active:bg-muted active:border-solid active:border-border',
        link:
          'bg-transparent text-primary border-0 underline-offset-4 ' +
          'hover:underline hover:text-accent ' +
          'active:text-accent',
      },
      size: {
        default: 'h-8 px-3 py-1 text-sm',
        sm: 'h-6 px-2 text-xs',
        lg: 'h-10 px-4 py-2 text-base',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function getButtonClasses(
  options?: ButtonVariantProps & { className?: string }
): string {
  return buttonVariants(options as ButtonVariantProps);
}
