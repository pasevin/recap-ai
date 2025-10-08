'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { UserConnectionCard } from './user-connection-card';

type ServiceType = 'github' | 'linear' | 'openai';

export interface ConnectionResult {
  success: boolean;
  message: string;
  details?: unknown;
}

export interface ConnectionTesterProps {
  service: ServiceType;
  token: string;
  onResult?: (result: ConnectionResult) => void;
  className?: string;
  disabled?: boolean;
  autoTest?: boolean;
  // GitHub-specific props
  githubUsername?: string;
  // Linear-specific props
  linearUserEmail?: string;
}

const SERVICE_CONFIG: Record<ServiceType, { name: string; endpoint: string }> =
  {
    github: {
      name: 'GitHub',
      endpoint: '/github/test',
    },
    linear: {
      name: 'Linear',
      endpoint: '/linear/test',
    },
    openai: {
      name: 'OpenAI',
      endpoint: '/openai/test',
    },
  };

async function testConnection(
  service: ServiceType,
  token: string,
  options?: { githubUsername?: string; linearUserEmail?: string }
): Promise<ConnectionResult> {
  try {
    const config = SERVICE_CONFIG[service];
    const payload: Record<string, unknown> = { token };

    // Add service-specific parameters
    if (service === 'github' && options?.githubUsername) {
      payload.username = options.githubUsername;
    }
    if (service === 'linear' && options?.linearUserEmail) {
      payload.email = options.linearUserEmail;
    }

    const response = await apiClient.post(config.endpoint, payload);

    // The API route already returns a ConnectionResult in response.data
    return response.data as ConnectionResult;
  } catch (error: unknown) {
    const getErrorMessage = (err: unknown): string => {
      if (err instanceof Error) {
        return err.message;
      }
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
        if ('message' in errorObj && typeof errorObj.message === 'string') {
          return errorObj.message;
        }
      }
      return 'Connection failed';
    };

    const getErrorDetails = (err: unknown): unknown => {
      if (typeof err === 'object' && err !== null) {
        const errorObj = err as Record<string, unknown>;
        if (
          'response' in errorObj &&
          typeof errorObj.response === 'object' &&
          errorObj.response !== null
        ) {
          const response = errorObj.response as Record<string, unknown>;
          if ('data' in response) {
            return response.data;
          }
        }
      }
      return undefined;
    };

    return {
      success: false,
      message: getErrorMessage(error),
      details: getErrorDetails(error),
    };
  }
}

export function ConnectionTester({
  service,
  token,
  onResult,
  className,
  disabled = false,
  autoTest = false,
  githubUsername,
  linearUserEmail,
}: ConnectionTesterProps) {
  const config = useMemo(() => SERVICE_CONFIG[service], [service]);

  const mutation = useMutation({
    mutationFn: () =>
      testConnection(service, token, { githubUsername, linearUserEmail }),
    onSuccess: (result) => {
      onResult?.(result);
    },
    onError: (error: unknown) => {
      const result: ConnectionResult = {
        success: false,
        message:
          error instanceof Error ? error.message : 'Connection test failed',
      };
      onResult?.(result);
    },
  });

  const handleTest = useCallback(() => {
    if (!token || token.trim().length === 0) {
      const result: ConnectionResult = {
        success: false,
        message: 'Please enter a valid token',
      };
      onResult?.(result);
      return;
    }

    mutation.mutate();
  }, [token, onResult, mutation]);

  // Auto-test when autoTest is enabled and we have a valid token
  useEffect(() => {
    if (
      autoTest &&
      token &&
      token.trim().length > 0 &&
      !disabled &&
      !mutation.data &&
      !mutation.isPending
    ) {
      // Small delay to prevent immediate firing on render
      const timer = setTimeout(() => {
        handleTest();
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    autoTest,
    token,
    disabled,
    mutation.data,
    mutation.isPending,
    handleTest,
  ]);

  const statusIcon = useMemo(() => {
    if (mutation.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
    }

    if (mutation.data?.success) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }

    if (mutation.data?.success === false) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }

    return <Wifi className="h-4 w-4 text-muted-foreground" />;
  }, [mutation.isPending, mutation.data?.success]);

  const statusText = useMemo(() => {
    if (mutation.isPending) {
      return 'Testing connection...';
    }

    if (mutation.data?.success) {
      return mutation.data.message;
    }

    if (mutation.data?.success === false) {
      return mutation.data.message;
    }

    return 'Ready to test';
  }, [mutation.isPending, mutation.data?.success, mutation.data?.message]);

  const statusColor = useMemo(() => {
    if (mutation.isPending) {
      return 'text-accent';
    }

    if (mutation.data?.success) {
      return 'text-success';
    }

    if (mutation.data?.success === false) {
      return 'text-destructive';
    }

    return 'text-muted-foreground';
  }, [mutation.isPending, mutation.data?.success]);

  return (
    <div className={cn('w-full touch-manipulation', className)}>
      <div className="space-y-4">
        {/* Show detailed results if available */}
        {mutation.data && !mutation.isPending && (
          <div className="mt-12">
            {mutation.data.success && mutation.data.details ? (
              (() => {
                const details = mutation.data.details as Record<
                  string,
                  unknown
                >;
                if (service === 'github') {
                  const auth = (details['authenticatedUser'] ?? {}) as Record<
                    string,
                    unknown
                  >;
                  const target = (details['targetUser'] ?? null) as Record<
                    string,
                    unknown
                  > | null;
                  return (
                    <UserConnectionCard
                      serviceName="GitHub"
                      owner={{
                        avatarUrl:
                          (auth['avatar_url'] as string | undefined) ?? null,
                        title:
                          (auth['name'] as string) ||
                          (auth['login'] as string) ||
                          'GitHub User',
                        subtitle: auth['login'] as string,
                        extraLine: 'Token owner – has API access',
                        publicCountLabel: 'public',
                        publicCount:
                          (auth['public_repos'] as number | undefined) ??
                          undefined,
                      }}
                      target={
                        target
                          ? {
                              avatarUrl:
                                (target['avatar_url'] as string | undefined) ??
                                null,
                              title:
                                (target['name'] as string) ||
                                (target['login'] as string) ||
                                'Target User',
                              subtitle: target['login'] as string,
                            }
                          : null
                      }
                    />
                  );
                }
                if (service === 'linear') {
                  const user = (details['user'] ?? {}) as Record<
                    string,
                    unknown
                  >;
                  const org = (details['organization'] ?? null) as Record<
                    string,
                    unknown
                  > | null;
                  const target = (details['targetUser'] ?? null) as Record<
                    string,
                    unknown
                  > | null;
                  return (
                    <UserConnectionCard
                      serviceName="Linear"
                      owner={{
                        avatarUrl:
                          (user['avatarUrl'] as string | undefined) ?? null,
                        title:
                          (user['displayName'] as string) ||
                          (user['name'] as string) ||
                          (user['email'] as string) ||
                          'Linear User',
                        subtitle:
                          (user['email'] as string | undefined) ?? undefined,
                        extraLine: 'Token owner – has API access',
                      }}
                      target={
                        target
                          ? {
                              avatarUrl:
                                (target['avatarUrl'] as string | undefined) ??
                                null,
                              title:
                                (target['displayName'] as string) ||
                                (target['name'] as string) ||
                                (target['email'] as string) ||
                                'Target User',
                              subtitle:
                                (target['email'] as string | undefined) ??
                                undefined,
                            }
                          : details['configuredEmail']
                            ? {
                                avatarUrl: null,
                                title:
                                  (details['configuredEmail'] as string) ||
                                  'Target User',
                                subtitle: details['configuredEmail'] as string,
                              }
                            : null
                      }
                      organization={
                        org
                          ? {
                              name: (org['name'] as string) || 'Organization',
                              id: org['id'] as string | undefined,
                              urlKey: org['urlKey'] as string | undefined,
                            }
                          : null
                      }
                    />
                  );
                }
                return null;
              })()
            ) : (
              /* Show standard alert for other services or error states */
              <Alert
                variant={mutation.data.success ? 'success' : 'destructive'}
              >
                <AlertIcon
                  variant={mutation.data.success ? 'success' : 'destructive'}
                >
                  {mutation.data.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </AlertIcon>
                <AlertContent>
                  <AlertTitle
                    variant={mutation.data.success ? 'success' : 'destructive'}
                  >
                    {mutation.data.message}
                  </AlertTitle>
                  <AlertDescription>
                    {(() => {
                      const details = mutation.data?.details;
                      if (
                        details &&
                        typeof details === 'object' &&
                        details !== null &&
                        Object.keys(details).length > 0
                      ) {
                        return (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100 transition-opacity touch-manipulation">
                              Show Technical Details
                            </summary>
                            <div className="mt-2 text-xs bg-muted/30 p-3 rounded-md overflow-x-auto max-w-full">
                              <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed font-mono">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        );
                      }
                      return null;
                    })()}
                  </AlertDescription>
                </AlertContent>
              </Alert>
            )}
          </div>
        )}

        {/* Button and status section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left side - status (or empty div to maintain layout) */}
          <div className="flex items-center gap-2 min-h-[24px] flex-1">
            {(!mutation.data || mutation.isPending) && (
              <>
                {statusIcon}
                <span className={cn('text-sm leading-relaxed', statusColor)}>
                  {statusText}
                </span>
              </>
            )}
          </div>

          {/* Right side - button (always right-aligned) */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={disabled || mutation.isPending || !token}
              aria-label={`Test ${config.name} connection`}
              className="min-h-[44px] min-w-[100px] touch-manipulation"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                `Test ${config.name}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ConnectionStatusProps {
  service: ServiceType;
  result?: ConnectionResult;
  className?: string;
}

export function ConnectionStatus({
  service,
  result,
  className,
}: ConnectionStatusProps) {
  const config = SERVICE_CONFIG[service];

  if (!result) {
    return null;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {result.success ? (
        <CheckCircle className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span
        className={cn(
          'text-sm font-mono',
          result.success ? 'text-success' : 'text-destructive'
        )}
      >
        {config.name}: {result.message}
      </span>
    </div>
  );
}
