'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { SubmitProgress } from './submit-progress';
import { Label } from '@/components/ui/label';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertIcon,
  AlertContent,
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataSource } from '@/lib/api/types';
import { Clock, WifiOff, Sparkles, Info } from 'lucide-react';
import { DataSourcesPicker } from './data-sources-picker';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

type BasicTimeframe = '1d' | '1w' | '2w' | '1m' | '3m' | '1y';

const sourcesSchema = z
  .array(z.enum(['github', 'linear']))
  .min(1, 'Select at least one data source');

const formSchema = z.object({
  timeframe: z.enum(['1d', '1w', '2w', '1m', '3m', '1y']),
  sources: sourcesSchema,
  format: z.enum(['markdown']).default('markdown'), // AI summaries should always be markdown
});

export type SummaryFormValues = z.infer<typeof formSchema>;

export interface SummaryFormProps {
  defaultValues?: Partial<SummaryFormValues>;
  onSubmit: (values: SummaryFormValues) => void;
  isSubmitting?: boolean;
  hasError?: boolean;
}

export function SummaryForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  hasError = false,
}: SummaryFormProps) {
  const isOnline = useOnlineStatus();

  const initialValues: SummaryFormValues = useMemo(
    () => ({
      timeframe: defaultValues?.timeframe ?? '1w',
      sources: defaultValues?.sources ?? (['github', 'linear'] as DataSource[]),
      format: defaultValues?.format ?? 'markdown',
    }),
    [defaultValues]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SummaryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const selectedSources = watch('sources');

  // No local progress phases; handled by shared SubmitProgress component

  return (
    <div className="space-y-6">
      {/* Header with helpful info (new Alert styling) */}
      <Alert>
        <AlertIcon>
          <Info />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>Quick AI Summary</AlertTitle>
          <AlertDescription>
            Generate intelligent summaries of your development activity. For
            advanced filtering, charts, and export options, visit{' '}
            <strong>Advanced Reports</strong>.
          </AlertDescription>
        </AlertContent>
      </Alert>

      <form
        className="space-y-6 terminal-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Timeframe Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <Label>Time Period</Label>
          </div>
          <Select
            onValueChange={(v) =>
              setValue('timeframe', v as BasicTimeframe, {
                shouldValidate: true,
              })
            }
            defaultValue={initialValues.timeframe}
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Choose how far back to analyze" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="1w">Last week</SelectItem>
              <SelectItem value="2w">Last 2 weeks</SelectItem>
              <SelectItem value="1m">Last month</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          {errors.timeframe && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <span className="w-1 h-1 bg-destructive rounded-full"></span>
              {errors.timeframe.message as string}
            </p>
          )}
        </div>

        {/* Data Sources */}
        <div className="space-y-3">
          <DataSourcesPicker
            value={selectedSources}
            onChange={(sources) => {
              setValue('sources', sources, { shouldValidate: true });
            }}
            disabled={isSubmitting}
          />
          {errors.sources && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <span className="w-1 h-1 bg-destructive rounded-full"></span>
              {errors.sources.message as string}
            </p>
          )}
          <input type="hidden" {...register('sources' as const)} />
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <Alert variant="destructive">
            <AlertIcon variant="destructive">
              <WifiOff />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Offline Error</AlertTitle>
              <AlertDescription>
                You are currently offline. Please check your internet connection
                to generate summaries.
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          type="submit"
          disabled={isSubmitting || selectedSources.length === 0 || !isOnline}
          size="lg"
          variant={hasError ? 'destructive' : !isOnline ? 'outline' : 'default'}
        >
          <SubmitProgress
            isOnline={isOnline}
            isSubmitting={isSubmitting}
            hasError={hasError}
            sources={selectedSources}
            idleLabel="Generate AI Summary"
            errorLabel="Retry Generate Summary"
            offlineLabel="Offline - Cannot Generate Summary"
            idleIcon={<Sparkles className="h-4 w-4" />}
            errorIcon={<Sparkles className="h-4 w-4" />}
            offlineIcon={<WifiOff className="h-4 w-4" />}
          />
        </Button>
      </form>
    </div>
  );
}
