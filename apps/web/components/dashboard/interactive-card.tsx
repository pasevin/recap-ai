'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export interface InteractiveCardProps {
  title: string;
  description: string;
  buttonText: string;
  isLoading?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
  hideButton?: boolean;
}

export function InteractiveCard({
  title,
  description,
  buttonText,
  isLoading = false,
  isError = false,
  isSuccess = false,
  onClick,
  disabled = false,
  children,
  hideButton = false,
}: InteractiveCardProps) {
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      );
    }

    if (isSuccess) {
      return (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      );
    }

    if (isError) {
      return (
        <>
          <XCircle className="mr-2 h-4 w-4" />
          Retry
        </>
      );
    }

    return buttonText;
  };

  const getButtonVariant = () => {
    if (isError) return 'destructive';
    if (isSuccess) return 'default';
    return 'default';
  };

  return (
    <Card
      className={`transition-all duration-200 ${isError ? 'border-red-200 bg-red-50/50' : isSuccess ? 'border-amber-200 bg-amber-50/50 dark:border-retro-amber-600/30 dark:bg-retro-amber-900/10' : 'hover:shadow-md'}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {isSuccess && <CheckCircle className="h-5 w-5 text-primary" />}
          {isError && <XCircle className="h-5 w-5 text-red-600" />}
        </CardTitle>
        <CardDescription className={isError ? 'text-red-600' : ''}>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {!hideButton && (
          <Button
            className="w-full"
            onClick={onClick}
            disabled={disabled || isLoading}
            variant={getButtonVariant()}
          >
            {getButtonContent()}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
