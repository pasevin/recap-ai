'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface CrtDownArrowProps {
  /** When true, the arrow renders and animates in; when false, nothing is shown */
  show?: boolean;
  /** Optional label to display above the arrow */
  label?: string;
  /** Additional classnames for the outer container */
  className?: string;
  /** Size scale for the icon (default 80px) */
  sizePx?: number;
  /** Optional delay in ms before animating in */
  delayMs?: number;
}

export function CrtDownArrow({
  show = false,
  label,
  className,
  sizePx = 80,
  delayMs = 0,
}: CrtDownArrowProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (show) {
      timeoutId = setTimeout(() => setVisible(true), delayMs);
    } else {
      setVisible(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [show, delayMs]);

  // Auto-scroll to the arrow container when it becomes visible
  useEffect(() => {
    if (!visible) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      // Scroll so the arrow is comfortably visible near the top of viewport
      const rect = el.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const offset = 80; // keep a small offset from top

      window.scrollTo({
        top: Math.max(absoluteTop - offset, 0),
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    } catch {
      // ignore scroll errors
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'crt-arrow-container pixel-surface flex flex-col items-center justify-center my-6 sm:my-8 py-8 sm:py-12',
        className
      )}
      style={{ overflow: 'visible' }}
      aria-live="polite"
      aria-atomic="true"
    >
      {label ? (
        <h3 className="mb-2 text-sm font-bold font-mono uppercase tracking-[0.18em] text-accent amber-glow animate-amber-glow">
          {label}
        </h3>
      ) : null}
      <ChevronDown
        className={cn('crt-arrow-glow animate-arrow-reveal-down')}
        style={{ width: sizePx, height: sizePx, strokeWidth: 2.75 }}
        aria-hidden="true"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </div>
  );
}

export default CrtDownArrow;
