'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Minus } from 'lucide-react';

import {
  generateShowcaseData,
  filterShowcaseByCategory,
  groupShowcaseByCategory,
} from '@/lib/utils/showcase';

import { ComponentShowcase } from './component-showcase';
import { ShowcaseControls } from './showcase-controls';
import { ResponsivePreview } from './responsive-preview';

export function DesignPreviewPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInteractiveOnly, setShowInteractiveOnly] = useState(false);
  const [enableResponsiveView, setEnableResponsiveView] = useState(false);
  const [scanlineSpeed, setScanlineSpeed] = useState<
    'normal' | 'fast' | 'slow'
  >('normal');
  const [scanlineStrength, setScanlineStrength] = useState<
    'normal' | 'strong' | 'off'
  >('strong');

  // Generate showcase data
  const showcaseData = useMemo(() => generateShowcaseData(), []);

  // Filter and organize data
  const filteredData = useMemo(() => {
    let filtered = filterShowcaseByCategory(showcaseData, selectedCategory);

    if (showInteractiveOnly) {
      filtered = filtered.filter((item) => item.hasInteractiveDemo);
    }

    return filtered;
  }, [showcaseData, selectedCategory, showInteractiveOnly]);

  const groupedData = useMemo(() => {
    return groupShowcaseByCategory(filteredData);
  }, [filteredData]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(showcaseData.map((item) => item.category)));
    return [{ value: 'all', label: 'All Components' }].concat(
      cats.map((cat) => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
      }))
    );
  }, [showcaseData]);

  return (
    <div className="space-y-8">
      {/* Page Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="terminal-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-accent amber-glow">
              {showcaseData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for preview
            </p>
          </CardContent>
        </Card>

        <Card className="terminal-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground amber-glow">
              {Object.keys(groupedData).length}
            </div>
            <p className="text-xs text-muted-foreground">Component types</p>
          </CardContent>
        </Card>

        <Card className="terminal-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-accent amber-glow">
              {showcaseData.filter((item) => item.hasInteractiveDemo).length}
            </div>
            <p className="text-xs text-muted-foreground">With demos</p>
          </CardContent>
        </Card>

        <Card className="terminal-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-accent amber-glow">
              {showcaseData.reduce(
                (total, item) => total + item.states.length,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total variations</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <ShowcaseControls
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        showInteractiveOnly={showInteractiveOnly}
        onInteractiveOnlyChange={setShowInteractiveOnly}
        enableResponsiveView={enableResponsiveView}
        onResponsiveViewChange={setEnableResponsiveView}
      />

      {/* Main Content */}
      <div className="space-y-8">
        {/* Scanline Animation Demo */}
        <Card className="terminal-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Scanline Animation Demo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase">Speed</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={scanlineSpeed === 'normal' ? 'default' : 'outline'}
                    onClick={() => setScanlineSpeed('normal')}
                  >
                    Normal
                  </Button>
                  <Button
                    size="sm"
                    variant={scanlineSpeed === 'fast' ? 'default' : 'outline'}
                    onClick={() => setScanlineSpeed('fast')}
                  >
                    Fast
                  </Button>
                  <Button
                    size="sm"
                    variant={scanlineSpeed === 'slow' ? 'default' : 'outline'}
                    onClick={() => setScanlineSpeed('slow')}
                  >
                    Slow
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase">Strength</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      scanlineStrength === 'normal' ? 'default' : 'outline'
                    }
                    onClick={() => setScanlineStrength('normal')}
                  >
                    Normal
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      scanlineStrength === 'strong' ? 'default' : 'outline'
                    }
                    onClick={() => setScanlineStrength('strong')}
                  >
                    Strong
                  </Button>
                  <Button
                    size="sm"
                    variant={scanlineStrength === 'off' ? 'default' : 'outline'}
                    onClick={() => setScanlineStrength('off')}
                  >
                    Off
                  </Button>
                </div>
              </div>
            </div>

            <div
              className={`relative h-24 w-full border-2 border-dashed border-border bg-background ${
                'subtle-scanlines' +
                (scanlineSpeed === 'fast'
                  ? ' fast'
                  : scanlineSpeed === 'slow'
                    ? ' slow'
                    : '') +
                (scanlineStrength === 'strong'
                  ? ' strong'
                  : scanlineStrength === 'off'
                    ? ' off'
                    : '')
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-terminal-dim">
                  Scanlines preview area
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {enableResponsiveView ? (
          <ResponsivePreview data={filteredData} />
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedData).length === 0 ? (
              <Card className="text-center py-12 terminal-border">
                <CardContent>
                  <div className="text-muted-foreground">
                    <div className="flex justify-center mb-4">
                      <Search className="w-16 h-16 amber-glow" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 font-mono amber-glow">
                      No components found
                    </h3>
                    <p className="font-mono">
                      Try adjusting your filters to see more components.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedData).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold font-mono amber-glow uppercase">
                      {category}
                    </h2>
                    <Badge variant="secondary" className="font-mono">
                      {items.length}{' '}
                      {items.length === 1 ? 'component' : 'components'}
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    {items.map((item) => (
                      <ComponentShowcase key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <Card className="terminal-panel">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-mono font-bold amber-glow flex items-center justify-center gap-2">
              TERMINAL COMPONENT PREVIEW <Minus className="w-3 h-3" />{' '}
              RETRO-FUTURISTIC INTERFACE
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              This preview showcases all terminal-styled components in the
              retro-futuristic theme. Use the controls above to filter by
              category or show interactive components only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
