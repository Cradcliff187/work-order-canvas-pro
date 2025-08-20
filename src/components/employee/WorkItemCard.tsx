import React from 'react';
import { MapPin, Briefcase, Star, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ClockOption {
  id: string;
  type: 'work_order' | 'project';
  title: string;
  number: string;
  section: 'assigned' | 'recent' | 'available';
  assigneeName?: string;
}

interface WorkItemCardProps {
  option: ClockOption;
  isSelected: boolean;
  onSelect: (option: ClockOption) => void;
  className?: string;
  iconClassName?: string;
}

export function WorkItemCard({ 
  option, 
  isSelected, 
  onSelect, 
  className,
  iconClassName 
}: WorkItemCardProps) {
  const getIcon = () => {
    if (option.section === 'assigned') {
      return <Star className="h-4 w-4" />;
    }
    if (option.section === 'recent') {
      return <Clock className="h-4 w-4" />;
    }
    return option.type === 'project' ? <Briefcase className="h-4 w-4" /> : <MapPin className="h-4 w-4" />;
  };

  const getDisplayNumber = () => {
    const prefix = option.type === 'project' ? 'PRJ' : 'WO';
    return `[${prefix}-${option.number}]`;
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-colors border",
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-accent',
        className
      )}
      onClick={() => onSelect(option)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            iconClassName || "bg-blue-100 text-blue-600"
          )}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {getDisplayNumber()} {option.title}
            </p>
            {option.assigneeName && (
              <p className="text-xs text-muted-foreground truncate">
                Assigned to: {option.assigneeName}
              </p>
            )}
          </div>
          {isSelected && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}