export interface RetroactiveTimeEntry {
  workOrderId?: string;
  projectId?: string;
  startTime: string; // HH:mm format
  endTime?: string; // HH:mm format
  date: Date;
  hoursWorked?: number;
}

export interface TimePreset {
  label: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export const TIME_PRESETS: TimePreset[] = [
  {
    label: "Full Day (8am-5pm)",
    startTime: "08:00",
    endTime: "17:00", 
    hours: 8
  },
  {
    label: "Morning (8am-12pm)",
    startTime: "08:00",
    endTime: "12:00",
    hours: 4
  },
  {
    label: "Afternoon (1pm-5pm)",
    startTime: "13:00",
    endTime: "17:00", 
    hours: 4
  }
];