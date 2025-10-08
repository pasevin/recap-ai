'use client';

import React from 'react';
import {
  CheckCircle,
  User,
  GitBranch,
  Lock,
  Shield,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GitHubUserData {
  login?: string;
  name?: string;
  avatar_url?: string;
  type?: string;
  public_repos?: number;
  private_repos?: number;
}

interface GitHubConnectionData {
  authenticatedUser?: GitHubUserData;
  targetUser?: GitHubUserData;
  targetUserError?: string;
}

interface GitHubUserInfoProps {
  userData: GitHubUserData | GitHubConnectionData | Record<string, unknown>;
  className?: string;
}

function UserCard({
  user,
  title,
  icon: Icon,
  description,
}: {
  user: GitHubUserData;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  const displayName = user.name || user.login || 'GitHub User';
  const username = user.login || 'unknown';

  return (
    <div className="border border-dashed border-success/30 p-3 bg-success/5 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-success success-glow" />
        <h4 className="text-sm font-mono text-success success-glow uppercase tracking-wider">
          {title}
        </h4>
      </div>

      {/* User Info */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <div className="relative w-12 h-12 border border-solid border-success bg-success/5 pixel-surface overflow-hidden">
              <img
                src={user.avatar_url}
                alt={`${username} avatar`}
                className="w-full h-full object-cover"
                style={{
                  filter:
                    'grayscale(100%) sepia(100%) hue-rotate(80deg) saturate(200%) brightness(0.8) contrast(1.2)',
                }}
              />
              {/* CRT Green overlay effects */}
              <div className="absolute inset-0 bg-success/40 mix-blend-multiply"></div>
              <div className="absolute inset-0 bg-success/20 mix-blend-overlay"></div>
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 100, 0.4) 1px, rgba(0, 255, 100, 0.4) 2px)`,
                }}
              ></div>
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 0%, rgba(0, 255, 100, 0.8) 50%, transparent 100%)`,
                  backgroundSize: '100% 8px',
                  animation: 'crt-scan 2s linear infinite',
                }}
              ></div>
              <div
                className="absolute inset-0 bg-success/15 mix-blend-overlay animate-pulse"
                style={{
                  animationDuration: '1.5s',
                  animationDelay: '0.3s',
                }}
              ></div>
            </div>
          ) : (
            <div className="w-12 h-12 border border-solid border-success bg-success/5 flex items-center justify-center pixel-surface">
              <User className="h-6 w-6 text-success success-glow" />
            </div>
          )}
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <h5 className="text-base font-mono font-bold text-success success-glow">
            {displayName}
          </h5>
          <p className="text-sm font-mono text-success/70">@{username}</p>
          <p className="text-xs font-mono text-success/60 mb-2">
            {description}
          </p>

          {/* Repository Stats */}
          <div className="flex items-center gap-4 text-xs">
            {typeof user.public_repos === 'number' && (
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3 text-success" />
                <span className="font-mono text-success">
                  {user.public_repos} public
                </span>
              </div>
            )}
            {typeof user.private_repos === 'number' && (
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-success" />
                <span className="font-mono text-success">
                  {user.private_repos} private
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GitHubUserInfo({ userData, className }: GitHubUserInfoProps) {
  // Type guard to check if this is the new format with authenticatedUser/targetUser
  const isNewFormat = (data: unknown): data is GitHubConnectionData => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return 'authenticatedUser' in obj;
  };

  // Type guard to check if this is legacy single-user format
  const isLegacyFormat = (data: unknown): data is GitHubUserData => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return 'login' in obj && !('authenticatedUser' in obj);
  };

  // Handle legacy single-user format
  if (isLegacyFormat(userData)) {
    return (
      <div
        className={cn(
          'font-mono transition-none pixel-surface flex',
          'bg-success/10 text-success [&>svg]:text-success alert-border-success-dashed',
          className
        )}
      >
        <div className="terminal-icon-sidebar success">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 p-4">
          <UserCard
            user={userData}
            title="Connected User"
            icon={Shield}
            description="API token owner"
          />
          <div className="border-t border-dashed border-success/30 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono success-glow">STATUS:</span>
              <span className="text-xs font-mono text-success">
                CONNECTION ESTABLISHED ✓
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle new format with authenticated and target users
  if (isNewFormat(userData)) {
    const { authenticatedUser, targetUser, targetUserError } = userData;

    if (!authenticatedUser) {
      return null;
    }

    const hasTargetUser =
      targetUser && targetUser.login !== authenticatedUser.login;

    return (
      <div
        className={cn(
          'font-mono transition-none pixel-surface flex',
          'bg-success/10 text-success [&>svg]:text-success alert-border-success-dashed',
          className
        )}
      >
        {/* Terminal Icon Sidebar */}
        <div className="terminal-icon-sidebar success">
          <CheckCircle className="w-6 h-6" />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Authenticated User */}
          <UserCard
            user={authenticatedUser}
            title="API Connection"
            icon={Shield}
            description="Token owner - has API access"
          />

          {/* Target User */}
          {hasTargetUser && (
            <UserCard
              user={targetUser!}
              title="Tracking Target"
              icon={Target}
              description="User whose activity will be summarized"
            />
          )}

          {/* Target User Error */}
          {targetUserError && (
            <div className="border border-dashed border-destructive/30 p-3 bg-destructive/5 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-destructive" />
                <h4 className="text-sm font-mono text-destructive uppercase tracking-wider">
                  Target User Error
                </h4>
              </div>
              <p className="text-xs font-mono text-destructive/70">
                {targetUserError}
              </p>
            </div>
          )}

          {/* Connection Status */}
          <div className="border-t border-dashed border-success/30 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono success-glow">STATUS:</span>
              <span className="text-xs font-mono text-success">
                CONNECTION ESTABLISHED ✓
                {hasTargetUser && ' • TRACKING TARGET USER'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown format
  return null;
}
