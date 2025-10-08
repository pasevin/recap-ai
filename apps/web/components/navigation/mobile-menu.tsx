'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  X,
  Home,
  Settings,
  BookOpen,
  Sparkles,
  Github,
  ExternalLink,
  Database,
} from 'lucide-react';

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
  external?: boolean;
  onClick?: () => void;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <Home className="h-5 w-5" />,
    description: 'Main dashboard and activity overview',
  },
  {
    label: 'Advanced Reports',
    href: '/reports',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Advanced AI summaries with charts, filters & export options',
    badge: 'AI',
  },
  {
    label: 'Data Explorer',
    href: '/data-explorer',
    icon: <Database className="h-5 w-5" />,
    description: 'Raw data retrieval and integration debugging',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    description: 'Configure integrations and preferences',
  },
  {
    label: 'Design Preview',
    href: '/design-preview',
    icon: <Sparkles className="h-5 w-5 text-retro-amber-500" />,
    description: 'Preview retro-futuristic UI components and styling',
    badge: 'NEW',
  },
  {
    label: 'API Documentation',
    href: '/api/docs',
    icon: <BookOpen className="h-5 w-5" />,
    description: 'API reference and integration guide',
    external: true,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/recap-ai/recap-ai',
    icon: <Github className="h-5 w-5" />,
    description: 'View source code and contribute',
    external: true,
  },
];

export function MobileMenu({ isOpen, onClose, className }: MobileMenuProps) {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      if (item.external) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = item.href;
      }
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={cn('fixed inset-0 z-50 lg:hidden', className)}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-background shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Recap AI</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 touch-manipulation"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {NAVIGATION_ITEMS.map((item, index) => (
                <Card
                  key={index}
                  className="hover:shadow-sm transition-shadow cursor-pointer touch-manipulation"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-sm">{item.label}</h3>
                          {item.badge && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {item.badge}
                            </span>
                          )}
                          {item.external && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/10">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">© 2025 Recap AI</p>
              <p className="text-xs text-muted-foreground mt-1">
                Built with Next.js and Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface MobileMenuTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function MobileMenuTrigger({
  isOpen,
  onToggle,
  className,
}: MobileMenuTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        'lg:hidden min-h-[44px] min-w-[44px] p-2 touch-manipulation',
        className
      )}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <X className="h-5 w-5" />
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      )}
    </Button>
  );
}
