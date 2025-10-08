'use client';

import { useState } from 'react';
import { useGitHubMutation } from '@/lib/hooks/api';
import { InteractiveCard } from './interactive-card';
import { TimeframeSelector } from './timeframe-selector';
import { Timeframe } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GitHubCard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1w');
  const [repository, setRepository] = useState('');

  const gitHubMutation = useGitHubMutation();

  const handleConnect = () => {
    gitHubMutation.mutate({
      timeframe,
      repository: repository.trim() || undefined,
      format: 'json',
    });
  };

  const isLoading = gitHubMutation.isPending;
  const isError = gitHubMutation.isError;
  const isSuccess = gitHubMutation.isSuccess;

  return (
    <InteractiveCard
      title="GitHub Integration"
      description={
        isError
          ? `Error: ${gitHubMutation.error?.message || 'Failed to fetch GitHub data'}`
          : isSuccess
            ? 'Successfully fetched GitHub data'
            : 'Aggregate your GitHub activity and commits'
      }
      buttonText="Connect GitHub"
      isLoading={isLoading}
      isError={isError}
      isSuccess={isSuccess}
      onClick={handleConnect}
    >
      <div className="space-y-4">
        <TimeframeSelector
          value={timeframe}
          onChange={setTimeframe}
          disabled={isLoading}
        />

        <div className="space-y-2">
          <Label htmlFor="repository" className="text-sm font-medium">
            Repository (optional)
          </Label>
          <Input
            id="repository"
            type="text"
            placeholder="owner/repo"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to fetch all repositories
          </p>
        </div>
      </div>
    </InteractiveCard>
  );
}
