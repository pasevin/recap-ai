'use client';

import React from 'react';
import { Github as GithubIcon } from 'lucide-react';
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

export interface GithubSettingsCardProps {
  values: {
    githubToken?: string;
    githubOwner?: string;
    githubRepo?: string;
    githubUsername?: string;
  };
  errors?: {
    githubToken?: { message?: string };
    githubOwner?: { message?: string };
    githubRepo?: { message?: string };
    githubUsername?: { message?: string };
  };
  register: <T extends string>(name: T) => unknown;
  setValue: UseFormSetValue<SettingsFormData>;
  onConnectionResult: (result: ConnectionResult) => void;
}

export function GithubSettingsCard({
  values,
  errors,
  register,
  setValue,
  onConnectionResult,
}: GithubSettingsCardProps) {
  const token = values.githubToken ?? '';
  const owner = values.githubOwner ?? '';
  const repo = values.githubRepo ?? '';
  const username = values.githubUsername ?? '';

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <GithubIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base sm:text-lg">
            GitHub Configuration
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          Configure your GitHub integration settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
        <TokenInput
          name="githubToken"
          label="Personal Access Token"
          value={token}
          onChange={(value) =>
            setValue('githubToken', value, { shouldDirty: true })
          }
          placeholder="ghp_..."
          error={errors?.githubToken?.message}
          description="Required for accessing GitHub repositories"
          required
        />
        <InputDescription>
          Create a token at{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Settings
          </a>{' '}
          with "repo" and "user" permissions
        </InputDescription>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="githubOwner" className="text-sm sm:text-base">
              GitHub Owner/Organization <sup className="text-current">*</sup>
            </Label>
            <Input
              id="githubOwner"
              {...(register('githubOwner') as object)}
              placeholder="microsoft"
              className="min-h-[44px] text-base sm:text-sm touch-manipulation"
            />
            {errors?.githubOwner && (
              <p className="text-sm text-destructive">
                {errors.githubOwner.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The owner or organization name from GitHub URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubRepo" className="text-sm sm:text-base">
              Repository Name <sup className="text-current">*</sup>
            </Label>
            <Input
              id="githubRepo"
              {...(register('githubRepo') as object)}
              placeholder="vscode"
              className="min-h-[44px] text-base sm:text-sm touch-manipulation"
            />
            {errors?.githubRepo && (
              <p className="text-sm text-destructive">
                {errors.githubRepo.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The repository name from GitHub URL
            </p>
          </div>
        </div>

        <InputDescription>
          💡 Find the owner and repository name in your GitHub URL: github.com/{' '}
          <span className="font-mono bg-muted/50 px-1 rounded">
            owner/repository
          </span>
        </InputDescription>

        <div className="space-y-2">
          <Label htmlFor="githubUsername" className="text-sm sm:text-base">
            Tracking GitHub Username <sup className="text-current">*</sup>
          </Label>
          <Input
            id="githubUsername"
            {...(register('githubUsername') as object)}
            placeholder="your-github-username"
            className="min-h-[44px] text-base sm:text-sm touch-manipulation"
          />
          {errors?.githubUsername && (
            <p className="text-sm text-destructive">
              {errors.githubUsername.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            The GitHub user whose activity will be summarized. Can differ from
            the token owner.
          </p>
        </div>

        {token && owner && repo && username && (
          <ConnectionTester
            service="github"
            token={token}
            githubUsername={username}
            onResult={onConnectionResult}
          />
        )}
      </CardContent>
    </Card>
  );
}
