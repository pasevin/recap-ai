'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface TokenInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function TokenInput({
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  description,
  className,
  disabled = false,
  required = false,
}: TokenInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="text-sm sm:text-base font-medium">
        {label}
        {required && <sup className="ml-1 text-current">*</sup>}
      </Label>

      <div className="relative group inline-block w-full">
        <Input
          id={name}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'peer pr-12 sm:pr-10 min-h-[44px] text-base sm:text-sm touch-manipulation hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]',
            error && 'border-destructive focus:border-destructive'
          )}
          aria-describedby={error ? `${name}-error` : undefined}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0 h-6 w-6 border border-dashed border-border bg-accent/10 flex items-center justify-center transition-all duration-200 hover:border-accent hover:bg-accent/20 hover:shadow-[0_0_4px_var(--color-accent)]"
          onClick={toggleVisibility}
          disabled={disabled}
          aria-label={isVisible ? 'Hide token' : 'Show token'}
        >
          {isVisible ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground amber-glow" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground amber-glow" />
          )}
        </Button>

        {/* Inline tooltips - validation error first, then description */}
        <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
          {error && (
            <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-destructive peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
              {error}
            </span>
          )}
          {description && (
            <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
