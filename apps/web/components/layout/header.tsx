'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MobileMenu,
  MobileMenuTrigger,
} from '@/components/navigation/mobile-menu';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const navItems = [
    { label: 'DASHBOARD', href: '/' },
    { label: 'ADVANCED REPORTS', href: '/reports' },
    { label: 'DATA EXPLORER', href: '/data-explorer' },
    { label: 'SETTINGS', href: '/settings' },
    { label: 'DESIGN PREVIEW', href: '/design-preview' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-dotted border-border bg-background">
        <div className="h-[2px] w-full bg-accent" />
        <div className="site-container px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div
              className="inline-block border-2 border-dashed border-border bg-card px-3 py-2 font-mono"
              style={{
                boxShadow:
                  '0 0 2px var(--color-accent), inset 0 0 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              <h1 className="text-lg sm:text-xl font-bold text-accent amber-glow uppercase tracking-wide crt-terminal-logo">
                RECAP AI
              </h1>
            </div>
            <nav className="hidden lg:flex items-center justify-between flex-1 ml-6">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href));
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    size="sm"
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'min-h-[40px] touch-manipulation uppercase tracking-wide font-mono',
                      isActive && 'font-bold amber-glow'
                    )}
                    onClick={() => handleNavigate(item.href)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            <div className="flex items-center">
              <MobileMenuTrigger
                isOpen={isMobileMenuOpen}
                onToggle={handleMobileMenuToggle}
              />
            </div>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={handleMobileMenuClose} />
    </>
  );
}
