import React from 'react';
import { useClockState } from '@/hooks/useClockState';
import { ClockInactive } from './clock/ClockInactive';
import { Card } from '@/components/ui/card';

interface ClockStatusCardProps {
  onClockOut: () => void;
  isClockingOut: boolean;
}

export const ClockStatusCard: React.FC<ClockStatusCardProps> = ({
  onClockOut,
  isClockingOut
}) => {
  const { isClocked } = useClockState();

  return isClocked ? (
    <Card className="p-6 text-center">
      <p className="text-muted-foreground">View active session below</p>
    </Card>
  ) : (
    <ClockInactive />
  );
};
