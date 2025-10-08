'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CategoryOption {
  value: string;
  label: string;
}

interface ShowcaseControlsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: CategoryOption[];
  showInteractiveOnly: boolean;
  onInteractiveOnlyChange: (enabled: boolean) => void;
  enableResponsiveView: boolean;
  onResponsiveViewChange: (enabled: boolean) => void;
}

export function ShowcaseControls({
  selectedCategory,
  onCategoryChange,
  categories,
  showInteractiveOnly,
  onInteractiveOnlyChange,
  enableResponsiveView,
  onResponsiveViewChange,
}: ShowcaseControlsProps) {
  return (
    <Card className="retro-glow border-retro-amber-600/30">
      <CardHeader>
        <CardTitle className="font-atomic text-retro-amber-500">
          Preview Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-mono amber-glow">
            Component Category
          </Label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="font-mono">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-3">
            <Switch
              id="interactive-only"
              checked={showInteractiveOnly}
              onCheckedChange={onInteractiveOnlyChange}
            />
            <Label htmlFor="interactive-only" className="font-mono text-sm">
              Interactive Components Only
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="responsive-view"
              checked={enableResponsiveView}
              onCheckedChange={onResponsiveViewChange}
            />
            <Label htmlFor="responsive-view" className="font-mono text-sm">
              Responsive Preview Mode
            </Label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-retro-amber-600/20 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange('buttons')}
              className="font-mono"
            >
              Show Buttons
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange('inputs')}
              className="font-mono"
            >
              Show Inputs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange('cards')}
              className="font-mono"
            >
              Show Cards
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInteractiveOnlyChange(true)}
              className="font-mono"
            >
              Interactive Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResponsiveViewChange(!enableResponsiveView)}
              className="font-mono"
            >
              {enableResponsiveView ? 'Normal View' : 'Responsive View'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onCategoryChange('all');
                onInteractiveOnlyChange(false);
                onResponsiveViewChange(false);
              }}
              className="font-mono"
            >
              Reset All
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="border-t border-retro-amber-600/20 pt-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                Terminal Components
              </Badge>
              {showInteractiveOnly && (
                <Badge variant="outline" className="font-mono">
                  Interactive Only
                </Badge>
              )}
              {enableResponsiveView && (
                <Badge variant="outline" className="font-mono">
                  Responsive
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground font-mono amber-glow">
              Category: {selectedCategory}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
