'use client';

import { useState } from 'react';
import { useGitHubMutation, useLinearMutation } from '@/lib/hooks/api';
import { TimeframeSelector } from './timeframe-selector';
import { Timeframe } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Github,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';

type OutputFormat = 'json' | 'summary';

interface ServiceSectionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  repositoryValue?: string;
  onRepositoryChange?: (value: string) => void;
  teamValue?: string;
  onTeamChange?: (value: string) => void;
  onFetch: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  result?: { content?: string; data?: unknown; warnings?: string[] };
  error?: string;
}

function ServiceSection({
  title,
  icon,
  description,
  timeframe,
  onTimeframeChange,
  format,
  onFormatChange,
  repositoryValue,
  onRepositoryChange,
  teamValue,
  onTeamChange,
  onFetch,
  isLoading,
  isSuccess,
  isError,
  result,
  error,
}: ServiceSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <TimeframeSelector
              value={timeframe}
              onChange={onTimeframeChange}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Output Format</Label>
            <Select
              value={format}
              onValueChange={(value: OutputFormat) => onFormatChange(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (structured data)</SelectItem>
                <SelectItem value="summary">Summary (plain text)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Repository input for GitHub */}
        {repositoryValue !== undefined && onRepositoryChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Repository (optional)</Label>
            <Input
              placeholder="owner/repo"
              value={repositoryValue}
              onChange={(e) => onRepositoryChange(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to fetch all repositories
            </p>
          </div>
        )}

        {/* Team ID input for Linear */}
        {teamValue !== undefined && onTeamChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Team ID (optional)</Label>
            <Input
              placeholder="team-id"
              value={teamValue}
              onChange={(e) => onTeamChange(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to fetch all teams
            </p>
          </div>
        )}

        <Button
          onClick={onFetch}
          disabled={isLoading}
          className="w-full"
          variant={isSuccess ? 'outline' : 'default'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
              Fetch Again
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Fetch Data
            </>
          )}
        </Button>

        {/* Results or Error Display */}
        {isError && error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isSuccess && result && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Data Retrieved</span>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {format === 'json'
                ? JSON.stringify(result.data ?? result, null, 2)
                : (result.content ?? 'No content available')}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DataSourcesTab() {
  // GitHub state
  const [githubTimeframe, setGithubTimeframe] = useState<Timeframe>('1w');
  const [githubFormat, setGithubFormat] = useState<OutputFormat>('json');
  const [githubRepository, setGithubRepository] = useState('');

  // Linear state
  const [linearTimeframe, setLinearTimeframe] = useState<Timeframe>('1w');
  const [linearFormat, setLinearFormat] = useState<OutputFormat>('json');
  const [linearTeam, setLinearTeam] = useState('');

  // API hooks
  const githubMutation = useGitHubMutation();
  const linearMutation = useLinearMutation();

  const handleGithubFetch = () => {
    githubMutation.mutate({
      timeframe: githubTimeframe,
      repository: githubRepository.trim() || undefined,
      format: githubFormat,
    });
  };

  const handleLinearFetch = () => {
    linearMutation.mutate({
      timeframe: linearTimeframe,
      teamId: linearTeam.trim() || undefined,
      format: linearFormat,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Individual Service Data</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Fetch raw data from individual services for testing, debugging, or
        direct analysis. Use different output formats and timeframes for each
        service.
      </p>

      <ServiceSection
        title="GitHub Data"
        icon={<Github className="h-4 w-4" />}
        description="Fetch commits, pull requests, and repository activity"
        timeframe={githubTimeframe}
        onTimeframeChange={setGithubTimeframe}
        format={githubFormat}
        onFormatChange={setGithubFormat}
        repositoryValue={githubRepository}
        onRepositoryChange={setGithubRepository}
        onFetch={handleGithubFetch}
        isLoading={githubMutation.isPending}
        isSuccess={githubMutation.isSuccess}
        isError={githubMutation.isError}
        result={githubMutation.data}
        error={githubMutation.error?.message}
      />

      <ServiceSection
        title="Linear Data"
        icon={
          <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center text-xs">
            L
          </div>
        }
        description="Fetch issues, projects, and team progress"
        timeframe={linearTimeframe}
        onTimeframeChange={setLinearTimeframe}
        format={linearFormat}
        onFormatChange={setLinearFormat}
        teamValue={linearTeam}
        onTeamChange={setLinearTeam}
        onFetch={handleLinearFetch}
        isLoading={linearMutation.isPending}
        isSuccess={linearMutation.isSuccess}
        isError={linearMutation.isError}
        result={linearMutation.data}
        error={linearMutation.error?.message}
      />

      <div className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Need AI Summaries?
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Visit the <strong>Dashboard</strong> for basic AI summaries, or{' '}
          <strong>Advanced Reports</strong> for comprehensive summaries with
          charts, export options, and advanced filtering. This Data Explorer is
          perfect for debugging integrations, inspecting raw data structure, and
          troubleshooting connections.
        </p>
      </div>
    </div>
  );
}
