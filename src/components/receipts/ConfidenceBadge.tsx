import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
  showTooltip?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  className = "",
  showTooltip = true 
}) => {
  const getVariant = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 50) return 'warning';
    return 'destructive';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return 'High Accuracy';
    if (confidence >= 50) return 'Medium Accuracy';
    return 'Low Accuracy - Please Verify';
  };

  const badge = (
    <Badge 
      variant={getVariant(confidence)} 
      className={`text-xs ${className}`}
    >
      {Math.round(confidence)}%
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getConfidenceText(confidence)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};