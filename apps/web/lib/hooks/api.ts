'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  SummarizeRequest,
  SummarizeResponse,
  GitHubRequest,
  GitHubResponse,
  LinearRequest,
  LinearResponse,
  ConfigGetRequest,
  ConfigSetRequest,
  ConfigResponse,
  ApiResponse,
  ApiError,
} from '../api/types';

// Query keys
export const queryKeys = {
  summarize: (params: SummarizeRequest) => ['summarize', params] as const,
  github: (params: GitHubRequest) => ['github', params] as const,
  linear: (params: LinearRequest) => ['linear', params] as const,
  config: (key?: string) => ['config', key] as const,
};

// Summarize hooks
export function useSummarize(
  params: SummarizeRequest,
  options?: Omit<
    UseQueryOptions<ApiResponse<SummarizeResponse>, ApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.summarize(params),
    queryFn: () => apiClient.post<SummarizeResponse>('/summarize', params),
    enabled: false, // Don't auto-fetch, require manual trigger
    ...options,
  });
}

export function useSummarizeMutation(options?: {
  onSuccess?: (data: ApiResponse<SummarizeResponse>) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SummarizeRequest) =>
      apiClient.post<SummarizeResponse>('/summarize', params),
    onSuccess: (data, variables) => {
      // Update cache with new data
      queryClient.setQueryData(queryKeys.summarize(variables), data);
      // Call user-provided onSuccess if available
      options?.onSuccess?.(data);
    },
    onError: (error: ApiError) => {
      // Call user-provided onError if available
      options?.onError?.(error);
    },
  });
}

// GitHub hooks
export function useGitHub(
  params: GitHubRequest,
  options?: Omit<
    UseQueryOptions<ApiResponse<GitHubResponse>, ApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.github(params),
    queryFn: () => apiClient.post<GitHubResponse>('/github', params),
    enabled: false, // Don't auto-fetch, require manual trigger
    ...options,
  });
}

export function useGitHubMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GitHubRequest) =>
      apiClient.post<GitHubResponse>('/github', params),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.github(variables), data);
    },
  });
}

// Linear hooks
export function useLinear(
  params: LinearRequest,
  options?: Omit<
    UseQueryOptions<ApiResponse<LinearResponse>, ApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.linear(params),
    queryFn: () => apiClient.post<LinearResponse>('/linear', params),
    enabled: false, // Don't auto-fetch, require manual trigger
    ...options,
  });
}

export function useLinearMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: LinearRequest) =>
      apiClient.post<LinearResponse>('/linear', params),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.linear(variables), data);
    },
  });
}

// Config hooks
export function useConfig(
  params: ConfigGetRequest = {},
  options?: Omit<
    UseQueryOptions<ApiResponse<ConfigResponse>, ApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.config(params.key),
    queryFn: () =>
      apiClient.get<ConfigResponse>(
        '/config',
        params as Record<string, string | undefined>
      ),
    ...options,
  });
}

export function useConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ConfigSetRequest) =>
      apiClient.post<ConfigResponse>('/config', params),
    onSuccess: () => {
      // Invalidate all config queries when config is updated
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

// Test connection hooks for individual services
export function useTestGitHubConnection() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<GitHubResponse>('/github', {
        timeframe: '1d',
        format: 'json',
      }),
  });
}

export function useTestLinearConnection() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<LinearResponse>('/linear', {
        timeframe: '1d',
        format: 'json',
      }),
  });
}
