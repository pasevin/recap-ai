'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ReportConfigurationForm,
  ReportConfigValues,
} from './report-configuration-form';
import { ReportPreviewDialog, ReportData } from './report-preview-dialog';
import { SummaryResult } from './summary-result';
import { useToast } from '@/components/feedback/toast-provider';
import { apiClient } from '@/lib/api/client';
import { SummarizeResponse } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
// No back button; results render below the configuration similar to the basic page
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { CrtDownArrow } from '@/components/ui/crt-down-arrow';

export function ReportConfigurationPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const toast = useToast();

  // Mutation for generating reports
  const generateReportMutation = useMutation({
    mutationFn: async (
      config: ReportConfigValues
    ): Promise<SummarizeResponse> => {
      // Helper function to create clean date strings without timezone issues
      const createDateString = (date: Date, isEndDate = false): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // For end dates, set to end of day; for start dates, set to start of day
        const time = isEndDate ? 'T23:59:59.999Z' : 'T00:00:00.000Z';

        return `${year}-${month}-${day}${time}`;
      };

      const timeframe =
        config.timeframe.preset ??
        `${createDateString(config.timeframe.custom!.startDate)}/${createDateString(config.timeframe.custom!.endDate, true)}`;

      const response = await apiClient.request<SummarizeResponse>(
        '/summarize',
        {
          method: 'POST',
          body: {
            timeframe,
            sources: config.sources,
            format: config.format,
            fullContext: config.fullContext,
            templateId: config.templateId,
            // Extended configuration for advanced filtering
            githubConfig: config.githubConfig,
            linearConfig: config.linearConfig,
            includeMetrics: config.includeMetrics,
            includeCharts: config.includeCharts,
            groupBy: config.groupBy,
            exportOptions: config.exportOptions,
            perspective: config.perspective,
            perspectiveName: config.perspectiveName,
          },
        }
      );

      if (!response.success) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        throw new Error(response.message || 'Failed to generate report');
      }

      return response.data;
    },
    onSuccess: (data, config) => {
      const timeRangeText = config.timeframe.preset
        ? {
            '1d': 'Last 24 hours',
            '1w': 'Last week',
            '2w': 'Last 2 weeks',
            '1m': 'Last month',
            '3m': 'Last 3 months',
            '6m': 'Last 6 months',
            '1y': 'Last year',
          }[config.timeframe.preset] || 'Custom range'
        : `${config.timeframe.custom!.startDate.toLocaleDateString()} - ${config.timeframe.custom!.endDate.toLocaleDateString()}`;

      // Transform the API response into ReportData format
      const transformedData: ReportData = {
        title: `Activity Report - ${timeRangeText}`,
        timeRange: timeRangeText,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        content: data.content || 'No content generated',
        metrics:
          data.summary && typeof data.summary === 'object'
            ? extractMetrics(data.summary)
            : undefined,
        rawData: data.data,
      };

      setReportData(transformedData);

      toast.success(
        'Report generated successfully! Your activity report is ready for review.',
        'Report Generated'
      );
    },
    onError: (error) => {
      console.error('Report generation failed:', error);

      // Handle different error types
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Report Generation Failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiError;
        if (apiError.message) {
          errorMessage = apiError.message;
        }
        if (apiError.code === 'NETWORK_ERROR') {
          errorTitle = 'Network Error';
          errorMessage = 'Please check your internet connection and try again.';
        }
      }

      toast.error(errorMessage, errorTitle);
    },
  });

  // Mutation for generating report preview
  const previewReportMutation = useMutation({
    mutationFn: async (config: ReportConfigValues): Promise<ReportData> => {
      // Generate a preview with limited data
      const timeRangeText = config.timeframe.preset
        ? {
            '1d': 'Last 24 hours',
            '1w': 'Last week',
            '2w': 'Last 2 weeks',
            '1m': 'Last month',
            '3m': 'Last 3 months',
            '6m': 'Last 6 months',
            '1y': 'Last year',
          }[config.timeframe.preset] || 'Custom range'
        : `${config.timeframe.custom!.startDate.toLocaleDateString()} - ${config.timeframe.custom!.endDate.toLocaleDateString()}`;

      // For preview, we'll show a sample of what the report would look like
      return {
        title: `Activity Report Preview - ${timeRangeText}`,
        timeRange: timeRangeText,
        content: generatePreviewContent(config),
        metrics: {
          commits: 42,
          issues: 15,
          pullRequests: 8,
          linesChanged: 2547,
          filesModified: 73,
          contributors: 5,
        },
      };
    },
    onSuccess: (data) => {
      setReportData(data);
      setPreviewOpen(true);
    },
    onError: (error) => {
      console.error('Preview generation failed:', error);

      // Handle different error types
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Preview Failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiError;
        if (apiError.message) {
          errorMessage = apiError.message;
        }
        if (apiError.code === 'NETWORK_ERROR') {
          errorTitle = 'Network Error';
          errorMessage = 'Please check your internet connection and try again.';
        }
      }

      toast.error(errorMessage, errorTitle);
    },
  });

  const handleFormSubmit = (values: ReportConfigValues) => {
    generateReportMutation.mutate(values);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>AI Summary</CardTitle>
        </div>
        <CardDescription>
          Generate an advanced activity report. Configure options below and view
          the result in the same panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReportConfigurationForm
          onSubmit={handleFormSubmit}
          isSubmitting={generateReportMutation.isPending}
          hasError={generateReportMutation.isError}
          unstyled
        />

        {reportData ? (
          <>
            <CrtDownArrow show label="Generated report below" sizePx={96} />
            <div className="border-t pt-6">
              <SummaryResult
                content={reportData.content ?? ''}
                formattedData={
                  (
                    generateReportMutation.data as unknown as {
                      formattedData?: string;
                    }
                  )?.formattedData
                }
                json={
                  (
                    generateReportMutation.data as unknown as {
                      data?: unknown;
                    }
                  )?.data
                }
              />
            </div>
          </>
        ) : null}
      </CardContent>

      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportData={reportData}
        isLoading={previewReportMutation.isPending}
      />
    </Card>
  );
}

// Helper function to extract metrics from API response
function extractMetrics(summary: unknown): Record<string, number> | undefined {
  if (!summary || typeof summary !== 'object') return undefined;

  const metrics: Record<string, number> = {};
  const summaryObj = summary as Record<string, unknown>;

  // Try to extract common metric patterns
  Object.entries(summaryObj).forEach(([key, value]) => {
    if (typeof value === 'number') {
      metrics[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested metrics
      const nestedObj = value as Record<string, unknown>;
      Object.entries(nestedObj).forEach(([nestedKey, nestedValue]) => {
        if (typeof nestedValue === 'number') {
          metrics[`${key}_${nestedKey}`] = nestedValue;
        }
      });
    }
  });

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

// Helper function to generate preview content
function generatePreviewContent(config: ReportConfigValues): string {
  const sources = config.sources.join(' and ');
  const timeRangeText = config.timeframe.preset
    ? {
        '1d': 'the last 24 hours',
        '1w': 'the last week',
        '2w': 'the last 2 weeks',
        '1m': 'the last month',
        '3m': 'the last 3 months',
        '6m': 'the last 6 months',
        '1y': 'the last year',
      }[config.timeframe.preset] || 'the custom date range'
    : 'the custom date range';

  let content = `# Activity Report Preview\n\n`;
  content += `This report covers activity from **${sources}** over **${timeRangeText}**.\n\n`;

  if (config.sources.includes('github')) {
    content += `## GitHub Activity\n\n`;
    if (config.githubConfig?.repository) {
      content += `### Repository: ${config.githubConfig.repository}\n\n`;
    }
    if (config.githubConfig?.includeCommits) {
      content += `- **Commits**: Recent commits and changes\n`;
    }
    if (config.githubConfig?.includePRs) {
      content += `- **Pull Requests**: Merged and open pull requests\n`;
    }
    if (config.githubConfig?.includeIssues) {
      content += `- **Issues**: Closed and active issues\n`;
    }
    content += `\n`;
  }

  if (config.sources.includes('linear')) {
    content += `## Linear Activity\n\n`;
    if (config.linearConfig?.teamId) {
      content += `### Team: ${config.linearConfig.teamId}\n\n`;
    }
    content += `- **Issues**: Completed and in-progress issues\n`;
    content += `- **Projects**: Project milestones and deliverables\n\n`;
  }

  if (config.includeMetrics) {
    content += `## Metrics Summary\n\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| Total Commits | 42 |\n`;
    content += `| Issues Closed | 15 |\n`;
    content += `| Pull Requests | 8 |\n`;
    content += `| Lines Changed | 2,547 |\n`;
    content += `| Files Modified | 73 |\n`;
    content += `| Contributors | 5 |\n\n`;
  }

  content += `---\n\n`;
  content += `*This is a preview of your report. The actual report will contain your real activity data.*`;

  return content;
}
