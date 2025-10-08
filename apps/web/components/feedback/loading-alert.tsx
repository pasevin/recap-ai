'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

interface LoadingAlertProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingAlert({
  title = 'Loading...',
  description,
  className,
}: LoadingAlertProps) {
  return (
    <Alert className={cn('pixel-loading', className)}>
      <AlertIcon>
        <Loader2 className="w-4 h-4 animate-spin" />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        {description ? (
          <AlertDescription>{description}</AlertDescription>
        ) : null}
      </AlertContent>
    </Alert>
  );
}
