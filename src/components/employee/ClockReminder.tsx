import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Clock, Star, X } from 'lucide-react';
import { useClockReminders } from '@/hooks/useClockReminders';
import { useClockState } from '@/hooks/useClockState';
import { cn } from '@/lib/utils';

interface ClockReminderProps {
  onOpenClockWidget?: () => void;
}

const reminderIcons = {
  coffee: Coffee,
  rest: Clock,
  star: Star,
};

const reminderStyles = {
  yellow: {
    cardClass: "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-600"
  },
  blue: {
    cardClass: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-600"
  },
  green: {
    cardClass: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-600"
  }
};

export const ClockReminder: React.FC<ClockReminderProps> = ({ onOpenClockWidget }) => {
  const { reminders, dismissReminder } = useClockReminders();
  const { clockOut } = useClockState();

  // Show only the first reminder to avoid overwhelming the user
  const currentReminder = reminders[0];

  if (!currentReminder) {
    return null;
  }

  const Icon = reminderIcons[currentReminder.icon as keyof typeof reminderIcons] || Clock;
  const styles = reminderStyles[currentReminder.variant];

  const handleAction = () => {
    switch (currentReminder.action) {
      case 'clockIn':
        onOpenClockWidget?.();
        break;
      case 'clockOut':
        clockOut.mutate(false);
        break;
      case 'dismiss':
      default:
        dismissReminder(currentReminder.id);
        break;
    }
  };

  const getActionLabel = () => {
    switch (currentReminder.action) {
      case 'clockIn':
        return 'Clock In';
      case 'clockOut':
        return 'Clock Out';
      case 'dismiss':
      default:
        return 'Got it';
    }
  };

  return (
    <Card className={cn("border", styles.cardClass)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("rounded-full p-2", styles.iconBg)}>
              <Icon className={cn("h-5 w-5", styles.iconColor)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{currentReminder.message}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAction} 
              size="sm" 
              variant={currentReminder.action === 'clockIn' ? 'default' : 'outline'}
              className="text-xs"
            >
              {getActionLabel()}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissReminder(currentReminder.id)}
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