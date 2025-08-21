export interface ClockOption {
  id: string;
  type: 'project' | 'work_order';
  title: string;
  number: string;
  section: 'assigned' | 'recent' | 'available' | 'today';
  assigneeName?: string;
  hoursToday?: number;
  lastWorkedAt?: Date;
  sessionCount?: number;
  isWorkedToday?: boolean;
}

export interface ClockFABProps {
  isClocked: boolean;
  elapsedTime: number;
  onFabClick: () => void;
  formatElapsedTime: (time: number) => string;
}

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export interface WorkSelectorProps {
  options: ClockOption[];
  selectedOption: ClockOption | null;
  onOptionSelect: (option: ClockOption) => void;
}

export interface ClockSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isClocked: boolean;
  clockInTime: Date | null;
  workOrderId: string | null;
  projectId: string | null;
  selectedOption: ClockOption | null;
  searchQuery: string;
  filteredOptions: ClockOption[];
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onOptionSelect: (option: ClockOption) => void;
  onCancel: () => void;
  onClockAction: () => void;
  formatElapsedTime: (time: number) => string;
}