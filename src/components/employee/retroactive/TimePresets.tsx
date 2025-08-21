import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { TIME_PRESETS, TimePreset } from './types';

interface TimePresetsProps {
  onSelectPreset: (preset: TimePreset) => void;
}

export const TimePresets: React.FC<TimePresetsProps> = ({ onSelectPreset }) => {
  return (
    <div className="space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Quick Presets
      </h4>
      <div className="grid gap-2">
        {TIME_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            onClick={() => onSelectPreset(preset)}
            className="justify-between h-auto p-3 text-left"
          >
            <div>
              <div className="font-medium">{preset.label}</div>
              <div className="text-sm text-muted-foreground">
                {preset.startTime} - {preset.endTime}
              </div>
            </div>
            <div className="text-sm font-medium">
              {preset.hours}h
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};