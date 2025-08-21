import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { getTimePresets, TimePreset } from './types';

interface TimePresetsProps {
  onSelectPreset: (preset: TimePreset) => void;
}

export const TimePresets: React.FC<TimePresetsProps> = ({ onSelectPreset }) => {
  const presets = getTimePresets();
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Quick Presets
      </h4>
      <div className="grid gap-2">
        {presets.map((preset, index) => (
          <Button
            key={`${preset.label}-${index}`}
            variant="outline"
            onClick={() => onSelectPreset(preset)}
            className="justify-between h-auto p-3 text-left"
          >
            <div>
              <div className="font-medium flex items-center gap-2">
                {preset.isDynamic && <Calendar className="h-3 w-3 text-primary" />}
                {preset.label}
              </div>
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