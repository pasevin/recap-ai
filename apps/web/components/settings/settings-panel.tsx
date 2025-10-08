'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Save, RefreshCw, AlertTriangle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertContent,
} from '@/components/ui/alert';
import { useToast } from '@/components/feedback/toast-provider';
import { cn } from '@/lib/utils';
import { TokenInput } from './token-input';
import { InputDescription } from '@/components/ui/input-description';
import { ConnectionTester, ConnectionResult } from './connection-tester';
import { SetupWizard } from './setup-wizard';
import { LoadingAlert } from '@/components/feedback/loading-alert';
import { GithubSettingsCard } from './github-settings-card';
import { LinearSettingsCard } from './linear-settings-card';

// Hook to fetch available OpenAI models
function useOpenAIModels(token?: string, baseUrl?: string) {
  return useQuery({
    queryKey: ['openai-models', token, baseUrl],
    queryFn: async () => {
      if (!token) return [];

      try {
        const apiUrl = baseUrl || 'https://api.openai.com/v1';
        const response = await fetch(`${apiUrl}/models`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format');
        }

        // Filter and sort GPT models by version (newest first)
        return data.data
          .filter(
            (model: { id: string }) =>
              model.id.startsWith('gpt-') &&
              !model.id.includes('instruct') &&
              !model.id.includes('base')
          )
          .map((model: { id: string }) => model.id)
          .sort((a: string, b: string) => {
            // Prioritize GPT-5 over GPT-4
            const aIsGpt5 = a.includes('gpt-5') ? 1 : 0;
            const bIsGpt5 = b.includes('gpt-5') ? 1 : 0;

            if (aIsGpt5 !== bIsGpt5) {
              return bIsGpt5 - aIsGpt5; // GPT-5 models come first
            }

            // Extract version numbers for comparison
            const aVersion = extractModelVersion(a);
            const bVersion = extractModelVersion(b);
            return bVersion - aVersion; // Descending order (newest first)
          })
          .slice(0, 10); // Show first 10 most relevant models

        function extractModelVersion(modelId: string): number {
          if (modelId.includes('gpt-5')) {
            return modelId.includes('gpt-5-turbo') ? 5.1 : 5.0;
          }
          if (modelId.includes('gpt-4o')) {
            return modelId.includes('gpt-4o-mini') ? 4.05 : 4.1;
          }
          if (modelId.includes('gpt-4-turbo')) {
            return 4.2;
          }
          if (modelId.includes('gpt-4')) {
            return 4.0;
          }
          if (modelId.includes('gpt-3.5')) {
            return 3.5;
          }
          const match = modelId.match(/gpt-(\d+(?:\.\d+)?)/);
          if (match) {
            const version = parseFloat(match[1]);
            return isNaN(version) ? 0 : version;
          }
          return 0;
        }
      } catch (error) {
        console.error('Failed to fetch OpenAI models:', error);
        return [];
      }
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
import {
  SettingsFormData,
  settingsFormSchema,
  CONFIG_KEY_MAPPING,
  isConfigurationComplete,
  getMissingConfigurationFields,
} from '@/lib/utils/settings-validation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  useUIPreferences,
  useSessionStorage,
} from '@/lib/hooks/use-secure-storage';
import { SessionStorage } from '@/lib/utils/secure-storage';

export interface SettingsPanelProps {
  className?: string;
  showWizard?: boolean;
  onWizardComplete?: () => void;
}

interface ConfigData {
  [key: string]: unknown;
}

// API functions
async function fetchConfiguration(): Promise<ConfigData> {
  try {
    const response = await apiClient.get('/config');
    return (response.data ?? {}) as ConfigData;
  } catch (error: unknown) {
    // 404 is expected for fresh installations with no config yet
    if (
      (error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404) ||
      (error instanceof Error &&
        'response' in error &&
        (error as { response: { status: number } }).response?.status === 404)
    ) {
      console.log(
        'No configuration found (fresh installation) - this is normal'
      );
      return {} as ConfigData;
    }

    // Log other errors as they might indicate real issues
    console.error('Failed to fetch configuration:', error);
    return {} as ConfigData;
  }
}

async function updateConfiguration(
  config: Record<string, unknown>
): Promise<void> {
  await apiClient.post('/config', config);
}

function transformConfigToFormData(
  config: ConfigData
): Partial<SettingsFormData> {
  // Extract githubUsername from github.defaults.person.identifier
  const githubDefaults = config['github.defaults'] as
    | Record<string, unknown>
    | undefined;
  const githubUsername =
    ((githubDefaults?.person as Record<string, unknown>)
      ?.identifier as string) ?? '';

  // Extract linearTeamId from linear.defaults.teamId
  const linearDefaults = config['linear.defaults'] as
    | Record<string, unknown>
    | undefined;
  const linearTeamId = (linearDefaults?.teamId as string) ?? '';
  const linearUserEmail =
    ((linearDefaults?.person as Record<string, unknown>)
      ?.identifier as string) ?? '';

  return {
    githubToken: (config['github.token'] as string) || '',
    githubOwner: (config['github.owner'] as string) || '',
    githubRepo: (config['github.repo'] as string) || '',
    githubUsername,
    linearToken: (config['linear.token'] as string) || '',
    linearTeamId,
    linearUserEmail,
    openaiToken: (config['openai.token'] as string) || '',
    openaiModel: (config['openai.model'] as string) || 'gpt-5-mini',
    openaiBaseUrl: (config['openai.baseUrl'] as string) || '',
    mcpEnabled: (config['mcp.enabled'] as boolean) || false,
    mcpPort: (config['mcp.port'] as number) || 3001,
    mcpHost: (config['mcp.host'] as string) || 'localhost',
    loggingLevel:
      (config['logging.level'] as 'debug' | 'info' | 'warn' | 'error') ||
      'info',
  };
}

function transformFormDataToConfig(
  data: SettingsFormData
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Handle simple key-value pairs first
  const simpleKeys = [
    'github.token',
    'github.owner',
    'github.repo',
    'linear.token',
    'openai.token',
  ];
  Object.entries(data).forEach(([key, value]) => {
    const configKey = CONFIG_KEY_MAPPING[key as keyof SettingsFormData];
    if (
      configKey &&
      value !== undefined &&
      value !== '' &&
      simpleKeys.includes(configKey)
    ) {
      config[configKey] = value;
    }
  });

  // Handle special case for github.defaults object
  if (data.githubUsername) {
    config['github.defaults'] = {
      person: {
        identifier: data.githubUsername,
        includeAuthored: true,
        includeReviewed: true,
        includeAssigned: true,
        includeCommented: true,
        includeMentioned: true,
      },
      timeframe: '1w',
      branch: 'main',
      prState: 'all',
    };
  }

  // Handle special case for linear.defaults object
  if (data.linearTeamId || data.linearUserEmail) {
    config['linear.defaults'] = {
      teamId: data.linearTeamId,
      timeframe: '1w',
      state: 'all',
      person: {
        identifier: data.linearUserEmail || '',
        includeCreated: true,
        includeAssigned: true,
        includeCommented: true,
        includeSubscribed: true,
        includeMentioned: true,
      },
      limit: 1000,
    };
  }

  return config;
}

// Component for dynamic OpenAI model selection
interface OpenAIModelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  token?: string;
  baseUrl?: string;
}

function OpenAIModelSelect({
  value,
  onValueChange,
  token,
  baseUrl,
}: OpenAIModelSelectProps) {
  const {
    data: availableModels,
    isLoading,
    error,
  } = useOpenAIModels(token, baseUrl);

  // Show loading state
  if (isLoading) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="min-h-[44px] touch-manipulation">
          <SelectValue placeholder="Loading models..." />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 text-sm text-muted-foreground">
            Loading models...
          </div>
        </SelectContent>
      </Select>
    );
  }

  // Show error state or fallback to hardcoded models if API fails
  const modelsToShow =
    error || !availableModels || availableModels.length === 0
      ? [
          'gpt-5-mini',
          'gpt-5',
          'gpt-4o-mini',
          'gpt-4o',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ]
      : availableModels;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="min-h-[44px] touch-manipulation">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {modelsToShow.map((modelId: string) => (
          <SelectItem key={modelId} value={modelId}>
            {modelId.replace(/^gpt-/, 'GPT-').replace(/-/g, ' ')}
          </SelectItem>
        ))}
        {error && (
          <div className="p-2 text-xs text-muted-foreground border-t">
            Unable to fetch latest models - showing defaults
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

export function SettingsPanel({
  className,
  showWizard = false,
  onWizardComplete,
}: SettingsPanelProps) {
  const { activeTab, setActiveTab } = useUIPreferences();
  const [, setConnectionResults] = useSessionStorage<
    Record<string, ConnectionResult>
  >('connection_results', {});
  const toast = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      githubToken: '',
      githubOwner: '',
      githubRepo: '',
      linearToken: '',
      openaiToken: '',
      openaiModel: 'gpt-5-mini',
      openaiBaseUrl: '',
      mcpEnabled: false,
      mcpPort: 3001,
      mcpHost: 'localhost',
      loggingLevel: 'info',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = form;
  const formData = watch();

  // Fetch current configuration
  const {
    data: configData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['configuration'],
    queryFn: fetchConfiguration,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 (fresh installation - no config exists yet)
      if (
        (error instanceof Error &&
          'status' in error &&
          (error as { status: number }).status === 404) ||
        (error instanceof Error &&
          'response' in error &&
          (error as { response: { status: number } }).response?.status === 404)
      ) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 0, // Always consider stale so config changes are reflected immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Update form when configuration loads
  useEffect(() => {
    if (configData) {
      const formData = transformConfigToFormData(configData);

      // Load local settings from localStorage
      try {
        const localSettingsStr = localStorage.getItem(
          'recap-ai-local-settings'
        );
        if (localSettingsStr) {
          const localSettings = JSON.parse(
            localSettingsStr
          ) as Partial<SettingsFormData>;
          Object.assign(formData, localSettings);
        }
      } catch (error) {
        console.warn('Failed to load local settings:', error);
      }

      // Use reset to properly initialize form with loaded data
      // This ensures isDirty works correctly
      reset(formData);
    }
  }, [configData, reset]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: updateConfiguration,
    onSuccess: () => {
      toast.success(
        'API tokens and repository settings have been saved successfully. Other preferences are stored locally.',
        'Settings Saved'
      );
      queryClient.invalidateQueries({ queryKey: ['configuration'] });
    },
    onError: (error: unknown) => {
      const getErrorMessage = (err: unknown): string => {
        if (typeof err === 'object' && err !== null) {
          const errorObj = err as Record<string, unknown>;
          if (
            'response' in errorObj &&
            typeof errorObj.response === 'object' &&
            errorObj.response !== null
          ) {
            const response = errorObj.response as Record<string, unknown>;
            if (
              'data' in response &&
              typeof response.data === 'object' &&
              response.data !== null
            ) {
              const data = response.data as Record<string, unknown>;
              if ('message' in data && typeof data.message === 'string') {
                return data.message;
              }
            }
          }
        }
        return 'Failed to save configuration';
      };

      toast.error(getErrorMessage(error), 'Error');
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    // Save CLI-supported settings to backend
    const configData = transformFormDataToConfig(data);
    saveConfigMutation.mutate(configData);

    // Save unsupported settings to local storage
    const localSettings = {
      openaiModel: data.openaiModel,
      openaiBaseUrl: data.openaiBaseUrl,
      mcpEnabled: data.mcpEnabled,
      mcpPort: data.mcpPort,
      mcpHost: data.mcpHost,
      loggingLevel: data.loggingLevel,
    };

    // Store in localStorage for persistence
    localStorage.setItem(
      'recap-ai-local-settings',
      JSON.stringify(localSettings)
    );
  };

  const handleConnectionResult = (
    service: string,
    result: ConnectionResult
  ) => {
    setConnectionResults((prev) => ({ ...prev, [service]: result }));
    // Also store individual connection test result in session storage
    SessionStorage.setConnectionTest(service, result.success);
  };

  const isConfigured =
    configData &&
    isConfigurationComplete(transformConfigToFormData(configData));
  const missingFields = configData
    ? getMissingConfigurationFields(transformConfigToFormData(configData))
    : [];

  // Move useCallback to top level to avoid Rules of Hooks violation
  const handleSetupComplete = useCallback(
    (
      config: SettingsFormData,
      onSuccess: () => void,
      onError: (error: unknown) => void
    ) => {
      const configData = transformFormDataToConfig(config);

      // Save unsupported settings to local storage
      const localSettings = {
        openaiModel: config.openaiModel,
        openaiBaseUrl: config.openaiBaseUrl,
        mcpEnabled: config.mcpEnabled,
        mcpPort: config.mcpPort,
        mcpHost: config.mcpHost,
        loggingLevel: config.loggingLevel,
      };
      localStorage.setItem(
        'recap-ai-local-settings',
        JSON.stringify(localSettings)
      );

      // Save CLI-supported settings and wait for completion
      saveConfigMutation.mutate(configData, {
        onSuccess: () => {
          // Call the wizard's success callback first
          onSuccess();
          // Then trigger the page-level completion
          onWizardComplete?.();
        },
        onError: (error: unknown) => {
          console.error('Setup save failed:', error);
          // Call the wizard's error callback
          onError(error);
        },
      });
    },
    [saveConfigMutation, onWizardComplete]
  );

  const setupWizardInitialData = useMemo(
    () => (configData ? transformConfigToFormData(configData) : undefined),
    [configData]
  );

  if (showWizard || (!isLoading && !isConfigured)) {
    return (
      <SetupWizard
        onComplete={handleSetupComplete}
        initialData={setupWizardInitialData}
        className={className}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <LoadingAlert title="Loading Configuration" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load configuration. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full shadow-sm', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Settings</CardTitle>
        </div>
        <CardDescription>
          Manage your API integrations and application settings
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {missingFields.length > 0 && (
          <Alert variant="destructive">
            <AlertIcon variant="destructive">
              <AlertTriangle />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>
                Missing required configuration: {missingFields.join(', ')}
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 sm:space-y-6"
        >
          {/** Map legacy persisted tabs to new values */}
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const mappedActiveTab =
              activeTab === 'general' || activeTab === 'integrations'
                ? 'data-sources'
                : activeTab;
            return (
              <Tabs value={mappedActiveTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 min-h-[48px]">
                  <TabsTrigger
                    value="data-sources"
                    className="text-xs sm:text-sm px-1 sm:px-3"
                  >
                    <span className="hidden sm:inline">Data Sources</span>
                    <span className="sm:hidden">Data</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="text-xs sm:text-sm px-1 sm:px-3"
                  >
                    <span className="hidden sm:inline">AI Settings</span>
                    <span className="sm:hidden">AI</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="text-xs sm:text-sm px-1 sm:px-3"
                  >
                    <span className="hidden sm:inline">Advanced</span>
                    <span className="sm:hidden">Adv</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="data-sources"
                  className="space-y-4 mt-4 sm:mt-6"
                >
                  <GithubSettingsCard
                    values={{
                      githubToken: formData.githubToken,
                      githubOwner: formData.githubOwner,
                      githubRepo: formData.githubRepo,
                      githubUsername: formData.githubUsername,
                    }}
                    errors={{
                      githubToken: errors.githubToken,
                      githubOwner: errors.githubOwner,
                      githubRepo: errors.githubRepo,
                      githubUsername: errors.githubUsername,
                    }}
                    register={
                      register as unknown as <T extends string>(
                        name: T
                      ) => unknown
                    }
                    setValue={setValue}
                    onConnectionResult={(result) =>
                      handleConnectionResult('github', result)
                    }
                  />

                  <LinearSettingsCard
                    values={{
                      linearToken: formData.linearToken,
                      linearTeamId: formData.linearTeamId,
                      linearUserEmail: formData.linearUserEmail,
                    }}
                    errors={{
                      linearToken: errors.linearToken,
                      linearTeamId: errors.linearTeamId,
                      linearUserEmail: errors.linearUserEmail,
                    }}
                    register={
                      register as unknown as <T extends string>(
                        name: T
                      ) => unknown
                    }
                    setValue={setValue}
                    onConnectionResult={(result) =>
                      handleConnectionResult('linear', result)
                    }
                  />
                </TabsContent>

                <TabsContent value="ai" className="space-y-4 mt-4 sm:mt-6">
                  <Card>
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base sm:text-lg">
                          OpenAI Configuration
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        Configure AI-powered features and summaries
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                      <TokenInput
                        name="openaiToken"
                        label="API Key"
                        value={formData.openaiToken ?? ''}
                        onChange={(value) =>
                          setValue('openaiToken', value, { shouldDirty: true })
                        }
                        placeholder="sk-..."
                        error={errors.openaiToken?.message}
                        description="Required for AI summaries and insights"
                        required
                      />
                      <InputDescription>
                        Get your API key from{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          OpenAI Platform
                        </a>{' '}
                        and ensure you have sufficient credits
                      </InputDescription>

                      <div className="space-y-2">
                        <Label
                          htmlFor="openaiModel"
                          className="text-sm sm:text-base"
                        >
                          Model
                        </Label>
                        <OpenAIModelSelect
                          value={formData.openaiModel}
                          onValueChange={(value) =>
                            setValue('openaiModel', value, {
                              shouldDirty: true,
                            })
                          }
                          token={formData.openaiToken}
                          baseUrl={formData.openaiBaseUrl}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="openaiBaseUrl"
                          className="text-sm sm:text-base"
                        >
                          Base URL (Optional)
                        </Label>
                        <Input
                          id="openaiBaseUrl"
                          {...register('openaiBaseUrl')}
                          placeholder="https://api.openai.com/v1"
                          type="url"
                          className="min-h-[44px] text-base sm:text-sm touch-manipulation"
                        />
                      </div>

                      {formData.openaiToken && (
                        <ConnectionTester
                          service="openai"
                          token={formData.openaiToken}
                          onResult={(result) =>
                            handleConnectionResult('openai', result)
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="advanced"
                  className="space-y-4 mt-4 sm:mt-6"
                >
                  <Accordion type="single" collapsible>
                    <AccordionItem value="mcp">
                      <AccordionTrigger>MCP Server Settings</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.mcpEnabled}
                            onCheckedChange={(checked) =>
                              setValue('mcpEnabled', checked, {
                                shouldDirty: true,
                              })
                            }
                          />
                          <Label>Enable MCP Server</Label>
                        </div>

                        {formData.mcpEnabled && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="mcpHost">Host</Label>
                                <Input
                                  id="mcpHost"
                                  {...register('mcpHost')}
                                  placeholder="localhost"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="mcpPort">Port</Label>
                                <Input
                                  id="mcpPort"
                                  type="number"
                                  {...register('mcpPort', {
                                    valueAsNumber: true,
                                  })}
                                  placeholder="3001"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="logging">
                      <AccordionTrigger>Logging Settings</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="loggingLevel">Log Level</Label>
                          <Select
                            value={formData.loggingLevel}
                            onValueChange={(
                              value: 'debug' | 'info' | 'warn' | 'error'
                            ) =>
                              setValue('loggingLevel', value, {
                                shouldDirty: true,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select log level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debug">Debug</SelectItem>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warn">Warning</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </Tabs>
            );
          })()}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 sm:pt-6">
            <Button
              type="submit"
              disabled={!isDirty || saveConfigMutation.isPending}
              className="min-h-[44px] w-full sm:w-auto touch-manipulation"
            >
              {saveConfigMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm sm:text-base">Save Configuration</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
