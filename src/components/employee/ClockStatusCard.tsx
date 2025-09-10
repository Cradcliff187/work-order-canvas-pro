import React from 'react';
import { useClockState } from '@/hooks/useClockState';
import { ClockInactive } from './clock/ClockInactive';
import { Card } from '@/components/ui/card';

export const ClockStatusCard: React.FC = () => {
  const { isClocked } = useClockState();

  return isClocked ? (
    <Card className="p-6 text-center">
      <p className="text-muted-foreground">View active session below</p>
    </Card>
  ) : (
    <ClockInactive />
  );
};
