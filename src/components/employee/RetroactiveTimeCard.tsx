import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, X } from 'lucide-react';
import { useRetroactiveTimePrompt } from '@/hooks/useRetroactiveTimePrompt';

interface RetroactiveTimeCardProps {
  onOpenModal: () => void;
}

export const RetroactiveTimeCard: React.FC<RetroactiveTimeCardProps> = ({ onOpenModal }) => {
  const { shouldShowPrompt, dismissPrompt } = useRetroactiveTimePrompt();

  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-warning/10 to-orange-500/10 border-warning/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-warning/20 rounded-full p-2">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Forgot to clock in?</h3>
                <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                  Retroactive Entry
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Add time for earlier today
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={onOpenModal} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Time
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};