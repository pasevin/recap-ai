'use client';

import React from 'react';
import { KanbanSquare } from 'lucide-react';
import { UseFormSetValue } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InputDescription } from '@/components/ui/input-description';
import { TokenInput } from './token-input';
import { ConnectionTester, ConnectionResult } from './connection-tester';
import { SettingsFormData } from '@/lib/utils/settings-validation';

export interface LinearSettingsCardProps {
  values: {
    linearToken?: string;
    linearTeamId?: string;
    linearUserEmail?: string;
  };
  errors?: {
    linearToken?: { message?: string };
    linearTeamId?: { message?: string };
    linearUserEmail?: { message?: string };
  };
  register: <T extends string>(name: T) => unknown;
  setValue: UseFormSetValue<SettingsFormData>;
  onConnectionResult: (result: ConnectionResult) => void;
}

export function LinearSettingsCard({
  values,
  errors,
  register,
  setValue,
  onConnectionResult,
}: LinearSettingsCardProps) {
  const token = values.linearToken ?? '';
  const teamId = values.linearTeamId ?? '';
  const userEmail = values.linearUserEmail ?? '';

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-base sm:text-lg">
            Linear Configuration
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          Configure your Linear workspace integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
        <TokenInput
          name="linearToken"
          label="API Key"
          value={token}
          onChange={(value) =>
            setValue('linearToken', value, { shouldDirty: true })
          }
          placeholder="lin_api_..."
          error={errors?.linearToken?.message}
          description="Required for accessing Linear issues and projects"
          required
        />
        <InputDescription>
          Create an API key at{' '}
          <a
            href="https://linear.app/settings/api"
            target="_blank"
            rel="noopener noreferrer"
          >
            Linear Settings
          </a>{' '}
          and copy the generated token
        </InputDescription>

        <div className="space-y-2">
          <Label htmlFor="linearTeamId" className="text-sm sm:text-base">
            Linear Team ID <sup className="text-current">*</sup>
          </Label>
          <Input
            id="linearTeamId"
            {...(register('linearTeamId') as object)}
            placeholder="e.g., TEAM_123 or your team's unique ID"
            className="min-h-[44px] text-base sm:text-sm touch-manipulation"
          />
          {errors?.linearTeamId && (
            <p className="text-sm text-destructive">
              {errors.linearTeamId.message}
            </p>
          )}
          <InputDescription>
            Find your team ID in{' '}
            <a
              href="https://linear.app/settings/teams"
              target="_blank"
              rel="noopener noreferrer"
            >
              Linear Team Settings
            </a>{' '}
            under General tab
          </InputDescription>
        </div>

        <div className="space-y-2">
          <Label htmlFor="linearUserEmail" className="text-sm sm:text-base">
            Linear Person Email <sup className="text-current">*</sup>
          </Label>
          <Input
            id="linearUserEmail"
            {...(register('linearUserEmail') as object)}
            placeholder="you@company.com"
            className="min-h-[44px] text-base sm:text-sm touch-manipulation"
            type="email"
          />
          {errors?.linearUserEmail && (
            <p className="text-sm text-destructive">
              {errors.linearUserEmail.message}
            </p>
          )}
          <InputDescription>
            We use your email to match Linear issues where you are creator,
            assignee, subscriber, or mentioned.
          </InputDescription>
        </div>

        {token && teamId && userEmail && (
          <ConnectionTester
            service="linear"
            token={token}
            linearUserEmail={userEmail}
            onResult={onConnectionResult}
          />
        )}
      </CardContent>
    </Card>
  );
}
