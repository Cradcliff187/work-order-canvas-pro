import React from 'react';
import { useClockState } from '@/hooks/useClockState';
import { ClockInactive } from './clock/ClockInactive';
import { ClockActive } from './clock/ClockActive';

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
    <ClockActive onClockOut={onClockOut} isClockingOut={isClockingOut} />
  ) : (
    <ClockInactive />
  );
};
