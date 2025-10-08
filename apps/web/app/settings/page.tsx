'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { isConfigurationComplete } from '@/lib/utils/settings-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { LoadingAlert } from '@/components/feedback/loading-alert';

// Fetch configuration to determine if setup is needed
async function fetchConfiguration(): Promise<Record<string, unknown>> {
  try {
    const response = await apiClient.get('/config');
    return (response.data ?? {}) as Record<string, unknown>;
  } catch (error: unknown) {
    // 404 is expected for fresh installations
    if (
      (error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404) ||
      (error instanceof Error &&
        'response' in error &&
        (error as { response: { status: number } }).response?.status === 404)
    ) {
      return {};
    }
    throw error;
  }
}

export default function SettingsPage() {
  const {
    data: configData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['settings-configuration'],
    queryFn: fetchConfiguration,
    retry: (failureCount, error: unknown) => {
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
  });

  const needsSetup = useMemo(
    () =>
      !configData ||
      !isConfigurationComplete({
        githubToken: configData['github.token'] as string,
        linearToken: configData['linear.token'] as string,
        openaiToken: configData['openai.token'] as string,
      }),
    [configData]
  );

  const handleSetupComplete = useCallback(() => {
    // Refetch configuration after setup
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <LoadingAlert title="Loading Settings" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <Settings className="h-5 w-5" />
                <span>Configuration Error</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Unable to load configuration. Please check your API connection.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {(error as Error)?.message || 'Unknown error'}
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Show setup wizard for first-time users
  if (needsSetup) {
    return (
      <MainLayout>
        <SettingsPanel onWizardComplete={handleSetupComplete} />
      </MainLayout>
    );
  }

  // Show regular settings panel for configured users
  return (
    <MainLayout>
      <SettingsPanel />
    </MainLayout>
  );
}
