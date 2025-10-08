'use client';

import { Database } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataSource } from '@/lib/api/types';

interface DataSourcesPickerProps {
  value: DataSource[];
  onChange: (value: DataSource[]) => void;
  disabled?: boolean;
  className?: string;
  showTitle?: boolean;
  showDescription?: boolean;
}

const dataSourceOptions = [
  {
    value: 'github' as const,
    label: 'GitHub',
    description: 'Commits, PRs, Issues',
  },
  {
    value: 'linear' as const,
    label: 'Linear',
    description: 'Tasks, Issues, Projects',
  },
];

export function DataSourcesPicker({
  value,
  onChange,
  disabled = false,
  className = '',
  showTitle = true,
  showDescription = true,
}: DataSourcesPickerProps) {
  const handleSet = (source: DataSource, checked: boolean) => {
    const currentSources = new Set(value);
    if (checked) {
      currentSources.add(source);
    } else {
      currentSources.delete(source);
    }
    onChange(Array.from(currentSources) as DataSource[]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Database className="h-4 w-4 text-primary" />
          <Label>Data Sources</Label>
        </div>
      )}

      {showDescription && (
        <p className="text-xs text-muted-foreground mb-3">
          Select which platforms to include in your summary
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {dataSourceOptions.map((option) => {
          const isSelected = value.includes(option.value);

          return (
            <Card
              key={option.value}
              className={`terminal-ignite-border transition-opacity ${
                isSelected ? '' : 'opacity-75'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CardHeader>
                <label
                  htmlFor={`source-${option.value}`}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id={`source-${option.value}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      !disabled && handleSet(option.value, Boolean(checked))
                    }
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                  />
                  <div className="flex-1">
                    <CardTitle
                      className={`text-sm ${
                        isSelected ? 'amber-glow' : 'amber-glow-dim'
                      }`}
                    >
                      {option.label}
                    </CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                </label>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default DataSourcesPicker;
