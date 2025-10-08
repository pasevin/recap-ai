'use client';

import React from 'react';
import { User, Building2, Target, Shield } from 'lucide-react';

interface LinearUser {
  id: string;
  name?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface LinearOrganization {
  id: string;
  name: string;
  urlKey: string;
}

interface LinearUserData {
  user: LinearUser; // token owner from viewer
  organization?: LinearOrganization | null;
  configuredEmail?: string | null; // email configured as target
  matchesConfiguredEmail?: boolean; // whether configured email matches viewer
  targetUser?: LinearUser | null; // optional future enhancement when we fetch target
}

interface LinearUserInfoProps {
  userData: LinearUserData | Record<string, unknown>;
}

export function LinearUserInfo({ userData }: LinearUserInfoProps) {
  // Type guard to ensure we have the expected structure
  const data = userData as LinearUserData;
  const {
    user,
    organization,
    configuredEmail,
    matchesConfiguredEmail,
    targetUser,
  } = data;

  if (!user) {
    return null;
  }

  const displayName =
    user.displayName || user.name || user.email || 'Linear User';
  const hasAvatar = user.avatarUrl && user.avatarUrl.trim().length > 0;

  // no-op variable removed; display logic handled inline

  return (
    <div className="font-mono transition-none pixel-surface flex bg-success/10 text-success [&>svg]:text-success alert-border-success-dashed">
      {/* Terminal Icon Sidebar */}
      <div className="terminal-icon-sidebar success">
        <User className="w-6 h-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Header with avatar and user info (API Connection) */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 border border-solid border-success bg-success/5 pixel-surface overflow-hidden">
              {hasAvatar ? (
                <div className="relative w-full h-full">
                  <img
                    src={user.avatarUrl}
                    alt={`${displayName} avatar`}
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
                <div className="w-full h-full bg-success/20 flex items-center justify-center">
                  <User className="h-8 w-8 text-success success-glow" />
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success success-glow" />
              <h3 className="text-lg font-mono font-bold text-success success-glow">
                API Connection
              </h3>
            </div>
            <div className="mt-1">
              <p className="text-sm font-mono text-success/90">{displayName}</p>
              {user.email && user.email !== displayName && (
                <p className="text-xs font-mono text-success/70">
                  {user.email}
                </p>
              )}
              <p className="text-xs font-mono text-success/70">ID: {user.id}</p>
            </div>
          </div>
        </div>

        {/* Target user (configured email) */}
        {configuredEmail && (
          <div className="border border-dashed border-success/30 p-3 bg-success/5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-success success-glow" />
              <h4 className="text-sm font-mono text-success success-glow uppercase tracking-wider">
                Tracking Target
              </h4>
            </div>
            {targetUser ? (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {targetUser.avatarUrl ? (
                    <div className="relative w-10 h-10 border border-solid border-success bg-success/5 pixel-surface overflow-hidden">
                      <img
                        src={targetUser.avatarUrl}
                        alt={`${targetUser.displayName ?? targetUser.name ?? targetUser.email ?? 'Target'} avatar`}
                        className="w-full h-full object-cover"
                        style={{
                          filter:
                            'grayscale(100%) sepia(100%) hue-rotate(80deg) saturate(200%) brightness(0.8) contrast(1.2)',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 border border-solid border-success bg-success/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-success success-glow" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-success/90">
                    {targetUser.displayName ||
                      targetUser.name ||
                      configuredEmail}
                  </div>
                  <div className="text-xs font-mono text-success/70">
                    {targetUser.email || configuredEmail}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-success/80">
                Email: {configuredEmail}
              </p>
            )}
          </div>
        )}

        {/* Organization Info Section */}
        {organization && (
          <div className="space-y-2 border-t border-dashed border-success/30 pt-3 mb-4">
            <h3 className="text-sm font-mono text-success success-glow uppercase tracking-wider">
              Organization
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-solid border-success flex-shrink-0 bg-success/20 flex items-center justify-center overflow-hidden">
                <Building2 className="h-6 w-6 text-success success-glow" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-mono font-bold text-success success-glow">
                  {organization.name}
                </h4>
                <p className="text-sm font-mono text-success/70">
                  URL Key: {organization.urlKey}
                </p>
                <p className="text-xs font-mono text-success/70">
                  ID: {organization.id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="border-t border-dashed border-success/30 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-success success-glow">
              CONNECTED TO LINEAR API
              {configuredEmail &&
                matchesConfiguredEmail !== false &&
                ' • TRACKING TARGET USER'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
