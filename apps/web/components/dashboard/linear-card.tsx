'use client';

import { useState } from 'react';
import { useLinearMutation } from '@/lib/hooks/api';
import { InteractiveCard } from './interactive-card';
import { TimeframeSelector } from './timeframe-selector';
import { Timeframe } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LinearCard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1w');
  const [teamId, setTeamId] = useState('');

  const linearMutation = useLinearMutation();

  const handleConnect = () => {
    linearMutation.mutate({
      timeframe,
      teamId: teamId.trim() || undefined,
      format: 'json',
    });
  };

  const isLoading = linearMutation.isPending;
  const isError = linearMutation.isError;
  const isSuccess = linearMutation.isSuccess;

  return (
    <InteractiveCard
      title="Linear Integration"
      description={
        isError
          ? `Error: ${linearMutation.error?.message || 'Failed to fetch Linear data'}`
          : isSuccess
            ? 'Successfully fetched Linear data'
            : 'Track your Linear issues and project progress'
      }
      buttonText="Connect Linear"
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
          <Label htmlFor="teamId" className="text-sm font-medium">
            Team ID (optional)
          </Label>
          <Input
            id="teamId"
            type="text"
            placeholder="team-id"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to fetch all teams
          </p>
        </div>
      </div>
    </InteractiveCard>
  );
}
