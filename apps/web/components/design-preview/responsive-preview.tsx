'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Monitor, Tablet, Smartphone, Search } from 'lucide-react';

import type { ComponentShowcaseItem } from '@/lib/utils/showcase';

interface ResponsivePreviewProps {
  data: ComponentShowcaseItem[];
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const viewportSizes = {
  mobile: { width: 375, height: 667, label: 'Mobile', icon: Smartphone },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  desktop: { width: 1200, height: 800, label: 'Desktop', icon: Monitor },
};

export function ResponsivePreview({ data }: ResponsivePreviewProps) {
  const [selectedViewport, setSelectedViewport] =
    useState<ViewportSize>('desktop');
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentShowcaseItem | null>(data[0] || null);

  const viewport = viewportSizes[selectedViewport];
  const IconComponent = viewport.icon;

  // Better scaling calculation that considers available space and maintains aspect ratio
  const calculateScale = () => {
    const maxWidth = 900; // Maximum width for the frame
    const maxHeight = 600; // Maximum height for the frame
    const scaleX = Math.min(1, maxWidth / viewport.width);
    const scaleY = Math.min(1, maxHeight / viewport.height);
    return Math.min(scaleX, scaleY);
  };

  const scale = calculateScale();

  const renderTerminalComponent = (item: ComponentShowcaseItem) => {
    const primaryState = item.states[0];
    const isMobile = selectedViewport === 'mobile';
    const isTablet = selectedViewport === 'tablet';

    switch (item.id) {
      case 'button':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Button disabled={primaryState?.disabled} className="w-full">
                {isMobile ? 'Tap' : 'Click'} Action
              </Button>
              <div
                className={`grid gap-2 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}
              >
                <Button variant="default" size={isMobile ? 'default' : 'sm'}>
                  Primary
                </Button>
                <Button variant="secondary" size={isMobile ? 'default' : 'sm'}>
                  Secondary
                </Button>
                <Button variant="outline" size={isMobile ? 'default' : 'sm'}>
                  Outline
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono opacity-60">
              {isMobile
                ? '📱 Mobile view - Full width buttons'
                : isTablet
                  ? '📱 Tablet view - 2 columns'
                  : '💻 Desktop view - 3 columns'}
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <input
                className="flex h-10 w-full border-2 border-inset border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-2 focus:border-inset focus:border-ring focus:bg-card transition-none"
                placeholder={isMobile ? 'Tap to type...' : 'Enter your text...'}
                disabled={primaryState?.disabled}
              />
              <div
                className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}
              >
                <input
                  className="flex h-10 w-full border-2 border-inset border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-2 focus:border-inset focus:border-ring focus:bg-card transition-none"
                  placeholder="Email"
                  type="email"
                />
                <input
                  className="flex h-10 w-full border-2 border-inset border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-2 focus:border-inset focus:border-ring focus:bg-card transition-none"
                  placeholder="Password"
                  type="password"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono opacity-60">
              {isMobile
                ? '📱 Stacked inputs for mobile'
                : '💻 Side-by-side layout'}
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-4">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="amber-glow text-base">
                  {isMobile
                    ? 'Mobile Card'
                    : isTablet
                      ? 'Tablet Card'
                      : 'Desktop Card'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground text-sm">
                  This terminal card adapts to {selectedViewport} viewports with
                  appropriate sizing and spacing.
                </p>
                <div
                  className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}
                >
                  <Button
                    size={isMobile ? 'default' : 'sm'}
                    className={isMobile ? 'w-full' : ''}
                  >
                    Action
                  </Button>
                  <Button
                    size={isMobile ? 'default' : 'sm'}
                    variant="outline"
                    className={isMobile ? 'w-full' : ''}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground font-mono opacity-60">
              {isMobile
                ? '📱 Vertical button layout'
                : '💻 Horizontal button layout'}
            </div>
          </div>
        );

      case 'tabs':
        return (
          <div className="space-y-4">
            <Tabs defaultValue="terminal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="terminal"
                  className={isMobile ? 'text-xs' : 'text-sm'}
                >
                  Terminal
                </TabsTrigger>
                <TabsTrigger
                  value="retro"
                  className={isMobile ? 'text-xs' : 'text-sm'}
                >
                  Retro UI
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className={isMobile ? 'text-xs' : 'text-sm'}
                >
                  {isMobile ? 'Config' : 'Settings'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="terminal" className="space-y-3">
                <h3 className="font-mono font-bold text-accent">
                  &gt; TERMINAL MODE ACTIVE
                </h3>
                <p className="text-sm">
                  Experience authentic {isMobile ? 'mobile' : selectedViewport}{' '}
                  terminal interface with amber phosphor glow, monospace
                  typography, and retro-futuristic aesthetics.
                </p>
                <div
                  className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}
                >
                  <Button size="sm" className={isMobile ? 'w-full' : ''}>
                    Execute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={isMobile ? 'w-full' : ''}
                  >
                    Abort
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="retro" className="space-y-3">
                <h3 className="font-mono font-bold text-accent">
                  &gt; RETRO INTERFACE
                </h3>
                <p className="text-sm">
                  Nostalgic computing experience with{' '}
                  {isMobile ? 'touch-optimized' : 'desktop-class'} controls,
                  inspired by classic terminal displays and command interfaces.
                </p>
              </TabsContent>

              <TabsContent value="settings" className="space-y-3">
                <h3 className="font-mono font-bold text-accent">
                  &gt; CONFIGURATION
                </h3>
                <p className="text-sm">
                  Customize your terminal experience with{' '}
                  {isMobile ? 'mobile-friendly' : viewport.label.toLowerCase()}
                  settings, color schemes, and interaction preferences.
                </p>
              </TabsContent>
            </Tabs>
            <div className="text-xs text-muted-foreground font-mono opacity-60">
              {isMobile
                ? '📱 Touch-optimized tab navigation'
                : '💻 Classic tab interface with hover effects'}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="p-4 terminal-border w-full">
              <p className="font-mono text-sm">Component: {item.name}</p>
              <p className="font-mono text-xs text-muted-foreground mt-2">
                Viewport: {viewport.width} × {viewport.height}px
              </p>
            </div>
            <div className="text-xs text-muted-foreground font-mono opacity-60">
              {selectedViewport.charAt(0).toUpperCase() +
                selectedViewport.slice(1)}{' '}
              preview
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Viewport Controls */}
      <Card className="terminal-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="amber-glow text-lg">
              📱 Responsive Terminal Preview
            </CardTitle>
            <Badge variant="secondary" className="font-mono">
              Scale: {Math.round(scale * 100)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Viewport Size Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-mono amber-glow font-bold">
                Device:
              </label>
              <Badge variant="outline" className="font-mono text-xs">
                {viewport.width} × {viewport.height}px
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(viewportSizes).map(([key, size]) => {
                const IconComp = size.icon;
                const isActive = selectedViewport === key;
                return (
                  <Button
                    key={key}
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => setSelectedViewport(key as ViewportSize)}
                    className="font-mono justify-start h-12 terminal-ignite-subtle hover:text-white"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <IconComp className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-bold">{size.label}</div>
                        <div className="text-xs opacity-75">
                          {size.width}×{size.height}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Component Selector */}
          <div className="space-y-3">
            <label className="text-sm font-mono amber-glow font-bold">
              Component to Preview:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.map((item) => {
                const isSelected = selectedComponent?.id === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedComponent(item)}
                    className="font-mono h-10 text-left justify-start terminal-ignite-subtle hover:text-white"
                    title={item.description}
                  >
                    <div className="truncate">
                      {isSelected && '› '}
                      {item.name}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Quick Info */}
          <div className="border-t border-dotted border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="text-center p-2 terminal-border">
                <div className="text-accent font-bold">VIEWPORT</div>
                <div className="text-muted-foreground">{viewport.label}</div>
              </div>
              <div className="text-center p-2 terminal-border">
                <div className="text-accent font-bold">COMPONENT</div>
                <div className="text-muted-foreground">
                  {selectedComponent?.name || 'None'}
                </div>
              </div>
              <div className="text-center p-2 terminal-border">
                <div className="text-accent font-bold">SCALE</div>
                <div className="text-muted-foreground">
                  {Math.round(scale * 100)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Frame */}
      <Card className="terminal-border overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconComponent className="w-6 h-6 text-accent" />
              <div>
                <CardTitle className="font-mono amber-glow text-base">
                  {viewport.label} Viewport
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground font-mono">
                    {viewport.width}W × {viewport.height}H
                  </p>
                  <Badge variant="outline" className="text-xs font-mono">
                    {scale === 1
                      ? 'Native'
                      : `${Math.round(scale * 100)}% Scale`}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {selectedComponent?.name || 'No Component'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-6">
          {/* Viewport Frame Container */}
          <div className="flex justify-center bg-muted/20 p-6">
            <div
              className="bg-card border-2 border-solid border-border shadow-lg overflow-hidden transition-all duration-500 ease-in-out"
              style={{
                width: viewport.width * scale,
                height: viewport.height * scale,
                minWidth: viewport.width * scale,
                minHeight: viewport.height * scale,
              }}
            >
              <div
                className="bg-background origin-top-left transition-all duration-500 ease-in-out"
                style={{
                  width: viewport.width,
                  height: viewport.height,
                  transform: `scale(${scale})`,
                }}
              >
                {/* Enhanced Browser/App Chrome */}
                <div className="h-10 bg-secondary border-b-2 border-border flex items-center px-4 gap-3">
                  {/* Window Controls */}
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div>
                  </div>

                  {/* Address Bar */}
                  <div className="flex-1 bg-background border border-border px-3 py-1 text-xs font-mono text-muted-foreground transition-all duration-200">
                    localhost:3000/{selectedComponent?.id || 'component'}
                  </div>

                  {/* Device Indicator */}
                  <div className="text-xs font-mono text-accent font-bold transition-all duration-200">
                    {selectedViewport.toUpperCase()}
                  </div>
                </div>

                {/* Component Content Area */}
                <div className="min-h-[calc(100%-2.5rem)] bg-background transition-all duration-300 ease-in-out">
                  {selectedComponent ? (
                    <div className="p-6 space-y-4 animate-in fade-in-50 duration-300">
                      {/* Component Header */}
                      <div className="border-b border-dotted border-border pb-4">
                        <h3 className="font-mono font-bold amber-glow text-lg mb-2 transition-all duration-200">
                          {selectedComponent.name.toUpperCase()}
                        </h3>
                        <p className="text-sm font-mono text-muted-foreground transition-all duration-200">
                          {selectedComponent.description}
                        </p>
                      </div>

                      {/* Component Demo */}
                      <div className="space-y-6 transition-all duration-300">
                        {renderTerminalComponent(selectedComponent)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in-50 duration-300">
                      <Search className="w-16 h-16 mb-4 animate-pulse text-muted-foreground" />
                      <p className="font-mono text-muted-foreground text-center transition-all duration-200">
                        Select a component above to preview it in this{' '}
                        {viewport.label.toLowerCase()} viewport
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Scale & Info Indicator */}
          <div className="px-6 pt-4 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 transition-all duration-200">
                  <span className="text-accent animate-pulse">●</span>
                  <span className="text-muted-foreground transition-all duration-200">
                    Rendered at {Math.round(scale * 100)}% scale
                  </span>
                </div>
                <div className="flex items-center gap-2 transition-all duration-200">
                  <span className="text-accent">●</span>
                  <span className="text-muted-foreground transition-all duration-200">
                    {viewport.width}×{viewport.height}px viewport
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground transition-all duration-200">
                {selectedComponent
                  ? `${selectedComponent.states.length} state${selectedComponent.states.length !== 1 ? 's' : ''} available`
                  : 'No component selected'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
