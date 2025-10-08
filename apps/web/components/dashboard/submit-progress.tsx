'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DataSource } from '@/lib/api/types';

export interface SubmitProgressProps {
  isOnline: boolean;
  isSubmitting: boolean;
  hasError?: boolean;
  sources: DataSource[];
  /** Optional mapping from source id to fetching label. Defaults handle GitHub & Linear. */
  sourceLabels?: Record<string, string>;
  idleLabel: string;
  errorLabel: string;
  offlineLabel: string;
  idleIcon?: React.ReactNode;
  errorIcon?: React.ReactNode;
  offlineIcon?: React.ReactNode;
  spinnerIcon?: React.ReactNode;
  phasesOverride?: string[];
}

function capitalize(id: string): string {
  if (!id) return id;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function usePhases(
  sources: DataSource[],
  override?: string[],
  labels?: Record<string, string>
): string[] {
  return useMemo(() => {
    if (override && override.length) return override;
    const defaults: Record<string, string> = {
      github: 'Fetching GitHub data...',
      linear: 'Fetching Linear data...',
    };
    const map = { ...defaults, ...(labels || {}) } as Record<string, string>;
    const steps: string[] = [];
    for (const src of sources) {
      steps.push(map[src] ?? `Fetching ${capitalize(String(src))} data...`);
    }
    steps.push('Generating AI summary...');
    return steps;
  }, [sources, override, labels]);
}

export function SubmitProgress({
  isOnline,
  isSubmitting,
  hasError,
  sources,
  idleLabel,
  errorLabel,
  offlineLabel,
  idleIcon,
  errorIcon,
  offlineIcon,
  spinnerIcon,
  phasesOverride,
  sourceLabels,
}: SubmitProgressProps) {
  const phases = usePhases(sources, phasesOverride, sourceLabels);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSubmitting) {
      setIndex(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1 < phases.length ? prev + 1 : prev));
    }, 1400);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSubmitting, phases.length]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        {offlineIcon}
        {offlineLabel}
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex items-center gap-2">
        {spinnerIcon ?? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        )}
        {phases[Math.min(index, phases.length - 1)]}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2">
        {errorIcon}
        {errorLabel}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {idleIcon}
      {idleLabel}
    </div>
  );
}
