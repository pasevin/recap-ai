import React from 'react';
import {
  CheckCircle,
  Shield,
  Target as TargetIcon,
  User,
  Building2,
  GitBranch,
} from 'lucide-react';

export interface OwnerInfo {
  avatarUrl?: string | null;
  title: string; // display name
  subtitle?: string; // username/email
  extraLine?: string; // e.g., 'Token owner – has API access'
  publicCountLabel?: string; // e.g., 'public'
  publicCount?: number; // e.g., repos count
}

export interface TargetInfo {
  avatarUrl?: string | null;
  title: string; // display name
  subtitle?: string; // username/email
  extraLine?: string; // e.g., 'User whose activity will be summarized'
}

export interface OrganizationInfo {
  name: string;
  id?: string;
  urlKey?: string;
}

export interface UserConnectionCardProps {
  owner: OwnerInfo;
  target?: TargetInfo | null;
  organization?: OrganizationInfo | null;
  serviceName: 'GitHub' | 'Linear';
}

function Avatar({ src, size = 48 }: { src?: string | null; size?: number }) {
  const dimension = `${size}px`;
  return (
    <div
      className="relative border border-solid border-success bg-success/5 pixel-surface overflow-hidden"
      style={{ width: dimension, height: dimension }}
    >
      {src ? (
        <img
          src={src}
          alt="user avatar"
          className="w-full h-full object-cover"
          style={{
            filter:
              'grayscale(100%) sepia(100%) hue-rotate(80deg) saturate(200%) brightness(0.8) contrast(1.2)',
          }}
        />
      ) : (
        <div className="w-full h-full bg-success/20 flex items-center justify-center">
          <User className="h-6 w-6 text-success success-glow" />
        </div>
      )}
    </div>
  );
}

export function UserConnectionCard({
  owner,
  target,
  organization,
  serviceName,
}: UserConnectionCardProps) {
  return (
    <div className="font-mono transition-none pixel-surface flex bg-success/10 text-success [&>svg]:text-success alert-border-success-dashed">
      {/* Sidebar icon (success) */}
      <div className="terminal-icon-sidebar success">
        <CheckCircle className="w-6 h-6" />
      </div>

      <div className="flex-1 p-4">
        {/* API CONNECTION */}
        <div className="border border-dashed border-success/30 p-3 bg-success/5 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-success success-glow" />
            <h4 className="text-sm font-mono text-success success-glow uppercase tracking-wider">
              API CONNECTION
            </h4>
          </div>
          <div className="flex items-start gap-3">
            <Avatar src={owner.avatarUrl ?? undefined} size={48} />
            <div className="flex-1 min-w-0">
              <h5 className="text-base font-mono font-bold text-success success-glow">
                {owner.title}
              </h5>
              {owner.subtitle && (
                <p className="text-sm font-mono text-success/70">
                  {owner.subtitle}
                </p>
              )}
              {owner.extraLine && (
                <p className="text-xs font-mono text-success/60 mb-1">
                  {owner.extraLine}
                </p>
              )}
              {typeof owner.publicCount === 'number' &&
                owner.publicCountLabel && (
                  <div className="flex items-center gap-1 text-xs">
                    <GitBranch className="h-3 w-3 text-success" />
                    <span className="font-mono text-success">
                      {owner.publicCount} {owner.publicCountLabel}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* TRACKING TARGET */}
        {target && (
          <div className="border border-dashed border-success/30 p-3 bg-success/5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TargetIcon className="h-4 w-4 text-success success-glow" />
              <h4 className="text-sm font-mono text-success success-glow uppercase tracking-wider">
                TRACKING TARGET
              </h4>
            </div>
            <div className="flex items-start gap-3">
              <Avatar src={target.avatarUrl ?? undefined} size={48} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-mono text-success success-glow">
                  {target.title}
                </div>
                {target.subtitle && (
                  <div className="text-xs font-mono text-success/70">
                    {target.subtitle}
                  </div>
                )}
                <p className="text-xs font-mono text-success/60 mt-1">
                  {target.extraLine ?? 'User whose activity will be summarized'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ORGANIZATION */}
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
                {organization.urlKey && (
                  <p className="text-sm font-mono text-success/70">
                    URL Key: {organization.urlKey}
                  </p>
                )}
                {organization.id && (
                  <p className="text-xs font-mono text-success/70">
                    ID: {organization.id}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATUS */}
        <div className="border-t border-dashed border-success/30 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-success success-glow">
              CONNECTED TO {serviceName.toUpperCase()} API
              {target && ' • TRACKING TARGET USER'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
