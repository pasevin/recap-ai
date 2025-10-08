'use client';

import { useToast } from '@/components/feedback/toast-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiError, ValidationErrorDetails } from '@/lib/api/types';
import { useSummarizeMutation } from '@/lib/hooks/api';
import { useMemo } from 'react';
import { SummaryForm, SummaryFormValues } from './summary-form';
import { SummaryResult } from './summary-result';
import { CrtDownArrow } from '@/components/ui/crt-down-arrow';

export function SummaryCard() {
  const toast = useToast();

  const summaryMutation = useSummarizeMutation({
    onError: (error: ApiError) => {
      console.error('Summary generation failed:', error);
      if (error.code === 'NETWORK_ERROR') {
        toast.error(
          'Network connection failed. Please check your internet connection and try again.'
        );
      } else if (error.status === 400) {
        // Safely extract error message from nested structure
        const errorMessage =
          (error.details as ValidationErrorDetails)?.error?.message ??
          'Invalid request parameters';
        toast.error(`Validation error: ${errorMessage}`);
      } else {
        toast.error(`Failed to generate summary: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Summary generated successfully!');
    },
  });

  const isLoading = summaryMutation.isPending;
  const isError = summaryMutation.isError;
  const isSuccess = summaryMutation.isSuccess;
  const result = useMemo(
    () => summaryMutation.data?.data,
    [summaryMutation.data]
  );

  const onSubmit = (values: SummaryFormValues) => {
    summaryMutation.mutate({
      ...values,
      perspective: 'third-person',
    });
  };

  const warnings = (summaryMutation.data?.warnings ?? []) as string[];

  // No status icon in header to keep the design minimal/clean

  const getStatusMessage = () => {
    if (isError)
      return summaryMutation.error?.message || 'Failed to generate summary';
    if (isSuccess) return 'Summary generated successfully';
    return 'Generate comprehensive AI-powered activity summaries';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center">
          <CardTitle>AI Summary</CardTitle>
        </div>
        <CardDescription>{getStatusMessage()}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <SummaryForm
          onSubmit={onSubmit}
          isSubmitting={isLoading}
          hasError={isError}
        />

        {isSuccess && result && (
          <>
            <CrtDownArrow show label="Generated report below" sizePx={96} />
            <div className="border-t pt-6">
              <SummaryResult
                content={result.content || ''}
                json={undefined}
                warnings={warnings}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
