'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DataSource } from '@/lib/api/types';

/**
 * @deprecated Use DataSourcesPicker instead for the enhanced card-based design
 * This component is kept for backwards compatibility but may be removed in future versions
 */

interface DataSourceSelectorProps {
  value: DataSource[];
  onChange: (value: DataSource[]) => void;
  disabled?: boolean;
}

const dataSourceOptions = [
  {
    value: 'github' as const,
    label: 'GitHub',
    description: 'Code commits, PRs, and issues',
  },
  {
    value: 'linear' as const,
    label: 'Linear',
    description: 'Issues and project progress',
  },
];

export function DataSourceSelector({
  value,
  onChange,
  disabled,
}: DataSourceSelectorProps) {
  const handleToggle = (source: DataSource, checked: boolean) => {
    if (checked) {
      onChange([...value, source]);
    } else {
      onChange(value.filter((s) => s !== source));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Data Sources</Label>
      <div className="space-y-2">
        {dataSourceOptions.map((option) => (
          <div key={option.value} className="flex items-start space-x-3">
            <Checkbox
              id={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) =>
                handleToggle(option.value, checked as boolean)
              }
              disabled={disabled}
            />
            <div className="space-y-1">
              <Label
                htmlFor={option.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
