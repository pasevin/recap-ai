'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  FileText,
  Filter,
  Settings2,
  Clock,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

import { Button } from '@/components/ui/button';
import { SubmitProgress } from './submit-progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

import { DataSource, Format, TemplateInfo } from '@/lib/api/types';
import { apiClient } from '@/lib/api/client';
import { DataSourcesPicker } from './data-sources-picker';

// Extended schema for report configuration
const reportConfigSchema = z.object({
  // Time range configuration
  timeframe: z
    .object({
      preset: z.enum(['1d', '1w', '2w', '1m', '3m', '6m', '1y']).optional(),
      custom: z
        .object({
          startDate: z.date(),
          endDate: z.date(),
        })
        .optional(),
    })
    .refine((data) => data.preset ?? data.custom, {
      message: 'Either preset or custom timeframe must be selected',
    })
    .refine(
      (data) => {
        // If custom is selected, both dates must be provided
        if (data.custom) {
          return data.custom.startDate && data.custom.endDate;
        }
        return true;
      },
      {
        message: 'Both start and end dates are required for custom timeframe',
        path: ['custom'],
      }
    ),

  // Data sources
  sources: z
    .array(z.enum(['github', 'linear']))
    .min(1, 'Select at least one data source'),

  // GitHub-specific configuration
  githubConfig: z
    .object({
      repository: z
        .string()
        .refine((val) => !val || /^[\w.-]+\/[\w.-]+$/.test(val), {
          message: 'Invalid repository format (owner/repo)',
        })
        .optional(),
      branch: z.string().optional(),
      authorFilter: z.string().optional(),
      includeIssues: z.boolean().default(true),
      includePRs: z.boolean().default(true),
      includeCommits: z.boolean().default(true),
    })
    .optional(),

  // Linear-specific configuration
  linearConfig: z
    .object({
      teamId: z.string().optional(),
      projectIds: z.array(z.string()).optional(),
      statusFilter: z.array(z.string()).optional(),
      assigneeFilter: z.string().optional(),
      priorityFilter: z
        .array(z.enum(['Low', 'Medium', 'High', 'Urgent']))
        .optional(),
    })
    .optional(),

  // Report options
  format: z.enum(['summary', 'markdown', 'json']).default('markdown'),
  fullContext: z.boolean().default(false),
  // Template selection (maps to CLI/OpenAI templateId)
  templateId: z.string().optional().default('default-standup-v1'),
  includeMetrics: z.boolean().default(true),
  includeCharts: z.boolean().default(false),
  groupBy: z.enum(['date', 'author', 'repository', 'team']).default('date'),
  perspective: z.enum(['first-person', 'third-person']).default('third-person'),
  perspectiveName: z.string().optional(),

  // Export options
  exportOptions: z.object({
    includeCharts: z.boolean().default(false),
    includeRawData: z.boolean().default(false),
  }),
});

export type ReportConfigValues = z.infer<typeof reportConfigSchema>;

export interface ReportConfigurationFormProps {
  defaultValues?: Partial<ReportConfigValues>;
  onSubmit: (values: ReportConfigValues) => void;
  isSubmitting?: boolean;
  hasError?: boolean;
  // When true, render only the form body (no Card wrapper/header)
  unstyled?: boolean;
}

// No more hardcoded report presets; templates are fetched from API

export function ReportConfigurationForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  hasError = false,
  unstyled = false,
}: ReportConfigurationFormProps) {
  const [availableTemplates, setAvailableTemplates] = useState<TemplateInfo[]>(
    []
  );
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(true);
  const [customDateRange, setCustomDateRange] = useState(false);
  const isOnline = useOnlineStatus();

  const initialValues: ReportConfigValues = useMemo(
    () => ({
      timeframe: defaultValues?.timeframe ?? { preset: '1w' },
      sources: defaultValues?.sources ?? ['github', 'linear'],
      githubConfig: defaultValues?.githubConfig ?? {
        includeIssues: true,
        includePRs: true,
        includeCommits: true,
      },
      linearConfig: defaultValues?.linearConfig ?? {},
      format: defaultValues?.format ?? 'markdown',
      fullContext: defaultValues?.fullContext ?? false,
      templateId: defaultValues?.templateId ?? 'default-standup-v1',
      includeMetrics: defaultValues?.includeMetrics ?? true,
      includeCharts: defaultValues?.includeCharts ?? false,
      groupBy: defaultValues?.groupBy ?? 'date',
      perspective: defaultValues?.perspective ?? 'third-person',
      perspectiveName: defaultValues?.perspectiveName,
      exportOptions: defaultValues?.exportOptions ?? {
        includeCharts: false,
        includeRawData: false,
      },
    }),
    [defaultValues]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ReportConfigValues>({
    resolver: zodResolver(reportConfigSchema),
    defaultValues: initialValues,
    mode: 'onBlur', // Enable validation on blur for better UX
  });

  const selectedSources = watch('sources');
  const timeframe = watch('timeframe');
  const outputFormat = watch('format');
  const fullContext = watch('fullContext');
  const templateId = watch('templateId');
  const perspective = watch('perspective');
  const groupBy = watch('groupBy');
  const includeMetrics = watch('includeMetrics');
  const includeCharts = watch('includeCharts');
  const exportOptions = watch('exportOptions');
  const githubConfig = watch('githubConfig');
  const perspectiveName = watch('perspectiveName');

  // Fetch templates on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setTemplatesLoading(true);
      try {
        const result = await apiClient.get<{ templates: TemplateInfo[] }>(
          '/templates'
        );
        if (mounted && result.success) {
          setAvailableTemplates(result.data.templates ?? []);
        }
      } catch {
        // If fetch fails, keep the default template fallback
      } finally {
        if (mounted) setTemplatesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ensure a default template is selected once templates are available
  useEffect(() => {
    if (templatesLoading) return;
    const ids = new Set(availableTemplates.map((t) => t.id));
    if (
      !templateId ||
      (availableTemplates.length > 0 && !ids.has(templateId))
    ) {
      const preferred =
        availableTemplates.find((t) => t.id === 'default-standup-v1') ??
        availableTemplates[0];
      if (preferred?.id) {
        setValue('templateId', preferred.id, { shouldValidate: true });
      }
    }
  }, [templatesLoading, availableTemplates, templateId, setValue]);

  const formElement = (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
          <TabsTrigger value="export">Export Options</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {/* Report Template */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Report Template</Label>
            <Select
              value={templatesLoading ? undefined : templateId}
              onValueChange={(v) =>
                setValue('templateId', v, { shouldValidate: true })
              }
              disabled={isSubmitting || templatesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    templatesLoading
                      ? 'Loading templates...'
                      : 'Select report template'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <SelectItem value="__loading__" disabled>
                    Loading...
                  </SelectItem>
                ) : availableTemplates.length > 0 ? (
                  availableTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="default-standup-v1">
                    Standup Summary (Default)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              <Label>Time Range</Label>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-range"
                  checked={customDateRange}
                  onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    setCustomDateRange(isChecked);

                    if (isChecked) {
                      // Clear preset and set up custom structure (no custom object yet)
                      setValue('timeframe', {}, { shouldValidate: true });
                    } else {
                      // Reset to preset mode
                      setValue(
                        'timeframe',
                        { preset: '1w' },
                        { shouldValidate: true }
                      );
                    }
                  }}
                  disabled={isSubmitting}
                />
                <Label htmlFor="custom-range">Use custom date range</Label>
              </div>

              {!customDateRange ? (
                <Select
                  onValueChange={(v) =>
                    setValue(
                      'timeframe',
                      {
                        preset: v as
                          | '1d'
                          | '1w'
                          | '2w'
                          | '1m'
                          | '3m'
                          | '6m'
                          | '1y',
                      },
                      { shouldValidate: true }
                    )
                  }
                  value={timeframe.preset ?? '1w'}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 hours</SelectItem>
                    <SelectItem value="1w">Last week</SelectItem>
                    <SelectItem value="2w">Last 2 weeks</SelectItem>
                    <SelectItem value="1m">Last month</SelectItem>
                    <SelectItem value="3m">Last 3 months</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="start-date"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !timeframe.custom?.startDate &&
                              'text-muted-foreground'
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {timeframe.custom?.startDate ? (
                            format(timeframe.custom.startDate, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={timeframe.custom?.startDate}
                          onSelect={(date) =>
                            setValue(
                              'timeframe',
                              {
                                custom: {
                                  startDate: date!,
                                  endDate:
                                    timeframe.custom?.endDate ?? new Date(),
                                },
                              },
                              { shouldValidate: true }
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="end-date"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !timeframe.custom?.endDate &&
                              'text-muted-foreground'
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {timeframe.custom?.endDate ? (
                            format(timeframe.custom.endDate, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={timeframe.custom?.endDate}
                          onSelect={(date) =>
                            setValue(
                              'timeframe',
                              {
                                custom: {
                                  startDate:
                                    timeframe.custom?.startDate ?? new Date(),
                                  endDate: date!,
                                },
                              },
                              { shouldValidate: true }
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
            {errors.timeframe && (
              <p className="text-sm text-destructive">
                {errors.timeframe.message}
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
              <p className="text-sm text-destructive">
                {errors.sources.message}
              </p>
            )}
          </div>

          {/* Perspective */}
          <Card className="retro-glow border-retro-amber-600/30">
            <CardHeader className="pb-3">
              <CardTitle className="font-atomic text-retro-amber-500 text-sm">
                Narrative Perspective
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Perspective Toggle */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="perspective-toggle"
                    checked={perspective === 'third-person'}
                    onCheckedChange={(checked) =>
                      setValue(
                        'perspective',
                        checked ? 'third-person' : 'first-person',
                        {
                          shouldValidate: true,
                        }
                      )
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="perspective-toggle"
                    className="font-mono text-sm"
                  >
                    Third Person Perspective
                  </Label>
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-retro-amber-600/20 pt-3">
                {perspective === 'third-person' ? (
                  <p className="text-xs font-mono text-muted-foreground">
                    Reports use third person by default. Provide an optional
                    display name if you prefer something other than the
                    configured identifier.
                  </p>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground">
                    Reports will speak in the author’s voice using first-person
                    language.
                  </p>
                )}
              </div>

              {/* Custom Name Input */}
              {perspective === 'third-person' && (
                <div className="space-y-2">
                  <Label
                    htmlFor="basic-perspective-name"
                    className="text-sm font-mono amber-glow"
                  >
                    Custom Display Name (Optional)
                  </Label>
                  <Input
                    id="basic-perspective-name"
                    placeholder="e.g., pasevin"
                    value={perspectiveName ?? ''}
                    onChange={(event) =>
                      setValue(
                        'perspectiveName',
                        event.target.value || undefined,
                        {
                          shouldValidate: false,
                        }
                      )
                    }
                    disabled={isSubmitting}
                    className="font-mono"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Output Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              <Label>Output Format</Label>
            </div>
            <Select
              onValueChange={(v) =>
                setValue('format', v as Format, { shouldValidate: true })
              }
              value={outputFormat}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary (plain text)</SelectItem>
                <SelectItem value="markdown">Markdown (formatted)</SelectItem>
                <SelectItem value="json">JSON (structured)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4" />
              <Label>Advanced Filters</Label>
            </div>

            <Accordion type="multiple" className="w-full">
              {/* GitHub Filters */}
              {selectedSources.includes('github') && (
                <AccordionItem value="github-filters">
                  <AccordionTrigger>GitHub Filters</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="github-repository">
                          Repository (owner/repo)
                        </Label>
                        <Input
                          id="github-repository"
                          placeholder="e.g., facebook/react"
                          {...register('githubConfig.repository', {
                            validate: (value) => {
                              if (!value) return true; // Allow empty
                              return (
                                /^[\w.-]+\/[\w.-]+$/.test(value) ||
                                'Invalid repository format (owner/repo)'
                              );
                            },
                          })}
                          disabled={isSubmitting}
                        />
                        {errors.githubConfig?.repository && (
                          <p className="text-sm text-destructive">
                            {errors.githubConfig.repository.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github-branch">Branch</Label>
                        <Input
                          id="github-branch"
                          placeholder="e.g., main, develop"
                          {...register('githubConfig.branch')}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github-author">Author Filter</Label>
                      <Input
                        id="github-author"
                        placeholder="e.g., john.doe@example.com or username"
                        {...register('githubConfig.authorFilter')}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Include in Report</Label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            {...register('githubConfig.includeCommits')}
                            checked={!!githubConfig?.includeCommits}
                            onCheckedChange={(checked) =>
                              setValue(
                                'githubConfig.includeCommits',
                                !!checked,
                                { shouldValidate: true }
                              )
                            }
                            disabled={isSubmitting}
                          />
                          <span className="text-sm">Commits</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            {...register('githubConfig.includePRs')}
                            checked={!!githubConfig?.includePRs}
                            onCheckedChange={(checked) =>
                              setValue('githubConfig.includePRs', !!checked, {
                                shouldValidate: true,
                              })
                            }
                            disabled={isSubmitting}
                          />
                          <span className="text-sm">Pull Requests</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            {...register('githubConfig.includeIssues')}
                            checked={!!githubConfig?.includeIssues}
                            onCheckedChange={(checked) =>
                              setValue(
                                'githubConfig.includeIssues',
                                !!checked,
                                { shouldValidate: true }
                              )
                            }
                            disabled={isSubmitting}
                          />
                          <span className="text-sm">Issues</span>
                        </label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Linear Filters */}
              {selectedSources.includes('linear') && (
                <AccordionItem value="linear-filters">
                  <AccordionTrigger>Linear Filters</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="linear-team">Team</Label>
                        <Select
                          onValueChange={(v) =>
                            setValue('linearConfig.teamId', v)
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineering">
                              Engineering
                            </SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linear-assignee">Assignee Filter</Label>
                        <Input
                          id="linear-assignee"
                          placeholder="e.g., john.doe@example.com"
                          {...register('linearConfig.assigneeFilter')}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Issue Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Backlog',
                          'Todo',
                          'In Progress',
                          'In Review',
                          'Done',
                          'Canceled',
                        ].map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2"
                          >
                            <Checkbox disabled={isSubmitting} />
                            <span className="text-sm">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                          <label
                            key={priority}
                            className="flex items-center gap-2"
                          >
                            <Checkbox disabled={isSubmitting} />
                            <span className="text-sm">{priority}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          {/* Report Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Report Options</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  {...register('includeMetrics')}
                  checked={includeMetrics}
                  onCheckedChange={(checked) =>
                    setValue('includeMetrics', !!checked, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                />
                <span className="text-sm">Include metrics and statistics</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  {...register('fullContext')}
                  checked={fullContext}
                  onCheckedChange={(checked) =>
                    setValue('fullContext', !!checked, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                />
                <span className="text-sm">
                  Full context (no truncation, expanded items)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  {...register('includeCharts')}
                  checked={includeCharts}
                  onCheckedChange={(checked) =>
                    setValue('includeCharts', !!checked, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                />
                <span className="text-sm">
                  Include charts and visualizations
                </span>
              </label>
            </div>
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select
                onValueChange={(v) =>
                  setValue(
                    'groupBy',
                    v as 'date' | 'author' | 'repository' | 'team',
                    { shouldValidate: true }
                  )
                }
                value={groupBy}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Group results by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="repository">Repository</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  {...register('exportOptions.includeCharts')}
                  checked={exportOptions?.includeCharts}
                  onCheckedChange={(checked) =>
                    setValue(
                      'exportOptions',
                      {
                        ...(exportOptions ?? {}),
                        includeCharts: !!checked,
                      },
                      { shouldValidate: true }
                    )
                  }
                  disabled={isSubmitting}
                />
                <span className="text-sm">
                  Include charts in exported files
                </span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  {...register('exportOptions.includeRawData')}
                  checked={exportOptions?.includeRawData}
                  onCheckedChange={(checked) =>
                    setValue(
                      'exportOptions',
                      {
                        ...(exportOptions ?? {}),
                        includeRawData: !!checked,
                      },
                      { shouldValidate: true }
                    )
                  }
                  disabled={isSubmitting}
                />
                <span className="text-sm">Include raw data in exports</span>
              </label>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <WifiOff className="h-5 w-5" />
            <p className="text-sm font-medium">Offline Error</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            You are currently offline. Please check your internet connection to
            generate reports.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          type="submit"
          disabled={
            isSubmitting ||
            selectedSources.length === 0 ||
            !isValid ||
            !isOnline
          }
          size="lg"
          variant={hasError ? 'destructive' : !isOnline ? 'outline' : 'default'}
        >
          <SubmitProgress
            isOnline={isOnline}
            isSubmitting={isSubmitting}
            hasError={hasError}
            sources={selectedSources as DataSource[]}
            idleLabel="Generate Report"
            errorLabel="Retry Generate Report"
            offlineLabel="Offline - Cannot Generate Report"
            idleIcon={<FileText className="mr-2 h-4 w-4" />}
            errorIcon={<FileText className="mr-2 h-4 w-4" />}
            offlineIcon={<WifiOff className="mr-2 h-4 w-4" />}
            sourceLabels={{
              github: 'Fetching GitHub data...',
              linear: 'Fetching Linear data...',
            }}
          />
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // TODO: Implement preview dialog
            // For now, this button is disabled until preview is implemented
          }}
          disabled={isSubmitting || !isOnline}
          size="lg"
        >
          {!isOnline ? (
            <>
              <WifiOff className="mr-2 h-4 w-4" />
              Offline
            </>
          ) : (
            'Preview'
          )}
        </Button>
      </div>
    </form>
  );

  if (unstyled) {
    return <div className="w-full">{formElement}</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>Report Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure advanced filters and options for your activity report
        </CardDescription>
      </CardHeader>
      <CardContent>{formElement}</CardContent>
    </Card>
  );
}
