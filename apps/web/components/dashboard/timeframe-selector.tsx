'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timeframe } from '@/lib/api/types';

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
  disabled?: boolean;
}

const timeframeOptions = [
  { value: '1d' as const, label: 'Last 24 hours' },
  { value: '1w' as const, label: 'Last week' },
  { value: '1m' as const, label: 'Last month' },
  { value: '1y' as const, label: 'Last year' },
];

export function TimeframeSelector({
  value,
  onChange,
  disabled,
}: TimeframeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="timeframe" className="text-sm font-medium">
        Timeframe
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="timeframe">
          <SelectValue placeholder="Select timeframe" />
        </SelectTrigger>
        <SelectContent>
          {timeframeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
