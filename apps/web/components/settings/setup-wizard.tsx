'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SessionStorage } from '@/lib/utils/secure-storage';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TokenInput } from './token-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputDescription } from '@/components/ui/input-description';
import { ConnectionTester, ConnectionResult } from './connection-tester';
import {
  SettingsFormData,
  settingsFormSchema,
  getTokenValidationError,
  isConfigurationComplete,
} from '@/lib/utils/settings-validation';

export interface SetupWizardProps {
  onComplete: (
    config: SettingsFormData,
    onSuccess: () => void,
    onError: (error: unknown) => void
  ) => void;
  className?: string;
  initialData?: Partial<SettingsFormData>;
}

type WizardStep =
  | 'welcome'
  | 'github'
  | 'linear'
  | 'openai'
  | 'review'
  | 'complete';

const STEPS: Array<{ key: WizardStep; title: string; description: string }> = [
  {
    key: 'welcome',
    title: 'Welcome',
    description: 'Get started with Recap AI',
  },
  {
    key: 'github',
    title: 'GitHub',
    description: 'Configure GitHub integration',
  },
  {
    key: 'linear',
    title: 'Linear',
    description: 'Configure Linear integration',
  },
  {
    key: 'openai',
    title: 'OpenAI',
    description: 'Configure AI features',
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Review your configuration',
  },
  {
    key: 'complete',
    title: 'Complete',
    description: 'Setup completed successfully',
  },
];

export function SetupWizard({
  onComplete,
  className,
  initialData,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [connectionResults, setConnectionResults] = useState<
    Record<string, ConnectionResult>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Save wizard progress to session storage
  useEffect(() => {
    SessionStorage.set({
      wizardProgress: {
        currentStep,
        completedSteps: STEPS.slice(
          0,
          STEPS.findIndex((s) => s.key === currentStep)
        ).map((s) => s.key),
      },
    });
  }, [currentStep]);

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
      ...initialData,
    },
  });

  const { watch, setValue, getValues, trigger } = form;
  const formData = watch();

  const currentStepIndex = STEPS.findIndex((step) => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'github':
        return (
          formData.githubToken &&
          formData.githubOwner &&
          formData.githubRepo &&
          formData.githubUsername &&
          !getTokenValidationError(formData.githubToken, 'github')
        );
      case 'linear':
        return (
          formData.linearToken &&
          formData.linearTeamId &&
          formData.linearUserEmail &&
          !getTokenValidationError(formData.linearToken, 'linear')
        );
      case 'openai':
        return (
          formData.openaiToken &&
          !getTokenValidationError(formData.openaiToken, 'openai')
        );
      case 'review':
        return isConfigurationComplete(formData);
      default:
        return true;
    }
  };

  const nextStep = async () => {
    const currentIndex = STEPS.findIndex((step) => step.key === currentStep);
    if (currentIndex < STEPS.length - 1) {
      // Only validate fields relevant to current step
      let isValid = true;

      switch (currentStep) {
        case 'welcome':
          // No validation needed for welcome step
          isValid = true;
          break;
        case 'github':
          // Only validate GitHub fields if provided
          if (
            formData.githubToken ||
            formData.githubOwner ||
            formData.githubRepo ||
            formData.githubUsername
          ) {
            isValid = await trigger([
              'githubToken',
              'githubOwner',
              'githubRepo',
              'githubUsername',
            ]);
          }
          break;
        case 'linear':
          // Only validate Linear fields if provided
          if (
            formData.linearToken ||
            formData.linearTeamId ||
            formData.linearUserEmail
          ) {
            isValid = await trigger([
              'linearToken',
              'linearTeamId',
              'linearUserEmail',
            ]);
          }
          break;
        case 'openai':
          // Only validate OpenAI token if provided
          if (formData.openaiToken) {
            isValid = await trigger(['openaiToken']);
          }
          break;
        case 'review':
          // Validate all fields for final review
          isValid = await trigger();
          break;
        default:
          isValid = true;
      }

      if (isValid) {
        setCurrentStep(STEPS[currentIndex + 1].key);
      }
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.findIndex((step) => step.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key);
    }
  };

  const handleComplete = () => {
    const config = getValues();
    setIsSaving(true);

    const onSuccess = () => {
      setIsSaving(false);
      setCurrentStep('complete');
    };

    const onError = (error: unknown) => {
      console.error('Setup failed:', error);
      setIsSaving(false);
      // Stay on review step to allow retry
    };

    onComplete(config, onSuccess, onError);
  };

  const handleConnectionResult = (
    service: string,
    result: ConnectionResult
  ) => {
    setConnectionResults((prev) => ({ ...prev, [service]: result }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl mt-6 font-bold font-mono uppercase amber-glow subtle-scanlines">
                Welcome to Recap AI
              </h2>
              <p className="font-mono max-w-md mx-auto">
                Let's set up your integrations to get started with AI-powered
                activity summaries
              </p>
            </div>
            <div className="rounded-lg p-4 space-y-2 terminal-border pixel-surface text-left">
              <h3 className="font-semibold font-mono uppercase amber-glow">
                You'll need:
              </h3>
              <ul className="text-sm text-foreground space-y-2 font-mono">
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                    <ChevronRight className="w-3 h-3 text-accent" />
                  </span>
                  <span>GitHub Personal Access Token</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                    <ChevronRight className="w-3 h-3 text-accent" />
                  </span>
                  <span>Linear API Key</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                    <ChevronRight className="w-3 h-3 text-accent" />
                  </span>
                  <span>OpenAI API Key</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'github':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold font-mono uppercase amber-glow">
                Configure GitHub
              </h2>
              <p className="text-terminal-dim font-mono">
                Connect your GitHub account to analyze repositories and pull
                requests
              </p>
            </div>

            <TokenInput
              name="github-token"
              label="GitHub Personal Access Token"
              value={formData.githubToken ?? ''}
              onChange={(value) =>
                setValue('githubToken', value, { shouldDirty: true })
              }
              placeholder="ghp_..."
              error={getTokenValidationError(
                formData.githubToken ?? '',
                'github'
              )}
              description="Required to access GitHub repositories and track activity"
              required
            />
            <InputDescription variant="terminal">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 terminal-form">
              <div className="space-y-2">
                <Label htmlFor="github-owner" className="text-sm font-mono">
                  GitHub Owner/Organization{' '}
                  <sup className="text-current">*</sup>
                </Label>
                <div className="relative group inline-block w-full">
                  <Input
                    id="github-owner"
                    placeholder="microsoft"
                    className="peer min-h-[44px] touch-manipulation font-mono hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]"
                    value={formData.githubOwner ?? ''}
                    onChange={(e) =>
                      setValue('githubOwner', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    required
                  />
                  {/* Inline tooltips - validation error takes priority */}
                  <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
                    <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
                      The owner or organization name from GitHub URL
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-repo" className="text-sm font-mono">
                  Repository Name <sup className="text-current">*</sup>
                </Label>
                <div className="relative group inline-block w-full">
                  <Input
                    id="github-repo"
                    placeholder="vscode"
                    className="peer min-h-[44px] touch-manipulation font-mono hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]"
                    value={formData.githubRepo ?? ''}
                    onChange={(e) =>
                      setValue('githubRepo', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    required
                  />
                  {/* Inline tooltips - validation error takes priority */}
                  <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
                    <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
                      The repository name from GitHub URL
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 terminal-form">
              <Label htmlFor="github-username" className="text-sm font-mono">
                Your GitHub Username <sup className="text-current">*</sup>
              </Label>
              <div className="relative group inline-block w-full">
                <Input
                  id="github-username"
                  placeholder="your-github-username"
                  className="peer min-h-[44px] touch-manipulation font-mono hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]"
                  value={formData.githubUsername ?? ''}
                  onChange={(e) =>
                    setValue('githubUsername', e.target.value, {
                      shouldDirty: true,
                    })
                  }
                  required
                />
                {/* Inline tooltips - validation error takes priority */}
                <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
                  <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
                    Your GitHub username to track activity for (this is whose
                    work will be summarized)
                  </span>
                </div>
              </div>
            </div>

            {formData.githubToken &&
              formData.githubOwner &&
              formData.githubRepo &&
              formData.githubUsername &&
              !getTokenValidationError(formData.githubToken, 'github') && (
                <ConnectionTester
                  service="github"
                  token={formData.githubToken}
                  githubUsername={formData.githubUsername}
                  onResult={(result) =>
                    handleConnectionResult('github', result)
                  }
                  autoTest={true}
                />
              )}
          </div>
        );

      case 'linear':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold font-mono uppercase amber-glow">
                Configure Linear
              </h2>
              <p className="text-terminal-dim font-mono">
                Connect your Linear workspace to track issues and project
                progress
              </p>
            </div>

            <TokenInput
              name="linear-token"
              label="Linear API Key"
              value={formData.linearToken ?? ''}
              onChange={(value) =>
                setValue('linearToken', value, { shouldDirty: true })
              }
              placeholder="lin_api_..."
              error={getTokenValidationError(
                formData.linearToken ?? '',
                'linear'
              )}
              description="Required to access Linear issues and project progress"
              required
            />
            <InputDescription variant="terminal">
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

            <div className="space-y-2 terminal-form">
              <Label htmlFor="linear-team-id" className="text-sm font-mono">
                Linear Team ID <sup className="text-current">*</sup>
              </Label>
              <div className="relative group inline-block w-full">
                <Input
                  id="linear-team-id"
                  placeholder="TEAM_123"
                  className="peer min-h-[44px] touch-manipulation font-mono hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]"
                  value={formData.linearTeamId ?? ''}
                  onChange={(e) =>
                    setValue('linearTeamId', e.target.value, {
                      shouldDirty: true,
                    })
                  }
                  required
                />
                {/* Inline tooltips - validation error takes priority */}
                <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
                  <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
                    Find your team ID in Linear settings under Team → General
                  </span>
                </div>
              </div>
              <InputDescription variant="terminal">
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

            <div className="space-y-2 terminal-form">
              <Label htmlFor="linear-user-email" className="text-sm font-mono">
                Linear Person Email <sup className="text-current">*</sup>
              </Label>
              <div className="relative group inline-block w-full">
                <Input
                  id="linear-user-email"
                  placeholder="you@company.com"
                  className="peer min-h-[44px] touch-manipulation font-mono hover:border-accent hover:bg-accent/5 hover:shadow-[0_0_6px_var(--color-accent)]"
                  value={formData.linearUserEmail ?? ''}
                  onChange={(e) =>
                    setValue('linearUserEmail', e.target.value, {
                      shouldDirty: true,
                    })
                  }
                  required
                  type="email"
                />
                <div className="absolute left-0 top-full mt-0 ml-0 flex gap-0 z-10">
                  <span className="hidden whitespace-nowrap px-2 py-1 text-[10px] font-mono bg-muted/90 text-foreground border-b border-l border-r border-border peer-focus:inline-block group-focus-within:inline-block transition-opacity duration-300 opacity-90 pointer-events-none">
                    We match issues where you are creator, assignee, subscriber,
                    or mentioned.
                  </span>
                </div>
              </div>
            </div>

            {formData.linearToken &&
              formData.linearTeamId &&
              !getTokenValidationError(formData.linearToken, 'linear') && (
                <ConnectionTester
                  service="linear"
                  token={formData.linearToken}
                  linearUserEmail={formData.linearUserEmail}
                  onResult={(result) =>
                    handleConnectionResult('linear', result)
                  }
                  autoTest={true}
                />
              )}
          </div>
        );

      case 'openai':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold font-mono uppercase amber-glow">
                Configure OpenAI
              </h2>
              <p className="text-terminal-dim font-mono">
                Connect to OpenAI to power AI summaries and insights
              </p>
            </div>

            <TokenInput
              name="openai-token"
              label="OpenAI API Key"
              value={formData.openaiToken ?? ''}
              onChange={(value) =>
                setValue('openaiToken', value, { shouldDirty: true })
              }
              placeholder="sk-..."
              error={getTokenValidationError(
                formData.openaiToken ?? '',
                'openai'
              )}
              description="Required for AI-powered summaries and insights"
              required
            />
            <InputDescription variant="terminal">
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

            {formData.openaiToken &&
              !getTokenValidationError(formData.openaiToken, 'openai') && (
                <ConnectionTester
                  service="openai"
                  token={formData.openaiToken}
                  onResult={(result) =>
                    handleConnectionResult('openai', result)
                  }
                  autoTest={true}
                />
              )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold font-mono uppercase amber-glow">
                Review Configuration
              </h2>
              <p className="text-terminal-dim font-mono">
                Verify your settings before completing setup
              </p>
            </div>

            <div className="space-y-4">
              {['github', 'linear', 'openai'].map((service) => {
                const result = connectionResults[service];
                const hasToken =
                  formData[`${service}Token` as keyof SettingsFormData];

                const serviceNames: Record<string, string> = {
                  github: 'GitHub',
                  linear: 'Linear',
                  openai: 'OpenAI',
                };

                return (
                  <Card
                    key={service}
                    className={cn(
                      'font-mono transition-none pixel-surface flex overflow-hidden p-4',
                      result?.success
                        ? 'bg-success/10 text-success [&>svg]:text-success alert-border-success-dashed'
                        : 'terminal-panel'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium font-mono">
                          {serviceNames[service]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result?.success && (
                          <CheckCircle className="h-4 w-4 text-success success-glow" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-mono',
                            result?.success
                              ? 'text-success success-glow'
                              : 'text-terminal-dim'
                          )}
                        >
                          {result?.success
                            ? 'Connected'
                            : hasToken
                              ? 'Configured'
                              : 'Not configured'}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-success/10 alert-border-success flex items-center justify-center">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase amber-glow">
                Setup Complete!
              </h2>
              <p className="text-sm sm:text-base text-terminal-dim font-mono max-w-sm sm:max-w-md mx-auto leading-relaxed px-4 sm:px-0">
                Your integrations are configured and ready to use. You can now
                generate AI-powered activity summaries.
              </p>
            </div>
            <div className="terminal-panel bg-success/10 max-w-md mx-auto">
              <p className="text-xs sm:text-sm font-mono text-success">
                🎉 All services connected successfully! You can now close this
                wizard and start using Recap AI.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        'w-full mx-auto touch-manipulation terminal-panel',
        className
      )}
    >
      <CardHeader className="px-10 -mx-4 -mt-4">
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-center">
            <h2 className="text-lg sm:text-xl font-bold font-mono uppercase amber-glow">
              Setup Wizard
            </h2>
          </div>
        </div>
        <Progress value={progress} className="h-2 sm:h-3" />
        <div className="flex justify-between text-xs sm:text-sm text-accent font-mono px-8 pt-3 pb-6">
          <span>
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pt-6 sm:pt-8">
        {renderStepContent()}

        {currentStep !== 'complete' && (
          <div className="flex flex-col sm:flex-row justify-between pt-4 sm:pt-6 space-y-3 sm:space-y-0 sm:space-x-4">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 'welcome'}
              className="min-h-[44px] touch-manipulation order-2 sm:order-1 font-mono"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isSaving}
                className="min-h-[44px] touch-manipulation bg-accent hover:bg-accent/80 text-accent-foreground order-1 sm:order-2 font-mono"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                variant="default"
                className="min-h-[44px] touch-manipulation order-1 sm:order-2 font-mono"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
