import { test, expect, describe } from 'bun:test';
import { buttonVariants } from '@/lib/ui/button-variants';

describe('buttonVariants', () => {
  test('returns default classes', () => {
    const classes = buttonVariants();
    expect(typeof classes).toBe('string');
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('h-8');
  });

  test('applies size variants', () => {
    const small = buttonVariants({ size: 'sm' });
    const large = buttonVariants({ size: 'lg' });
    expect(small).toContain('h-6');
    expect(large).toContain('h-10');
  });

  test('applies style variants', () => {
    const outline = buttonVariants({ variant: 'outline' });
    const ghost = buttonVariants({ variant: 'ghost' });
    const link = buttonVariants({ variant: 'link' });

    expect(outline).toContain('border-dashed');
    expect(ghost).toContain('border-transparent');
    expect(link).toContain('underline-offset-4');
  });

  test('applies destructive styles', () => {
    const destructive = buttonVariants({ variant: 'destructive' });
    expect(destructive).toContain('bg-destructive');
    expect(destructive).toContain('border-destructive');
  });
});
