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
  date?: Date; // Optional date for dynamic presets
  isDynamic?: boolean; // Indicates if this preset sets a specific date
}

export const getTimePresets = (): TimePreset[] => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isEarlyMorning = now.getHours() < 12; // Before noon
  
  const staticPresets: TimePreset[] = [
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

  const dynamicPresets: TimePreset[] = [];
  
  // Add "Yesterday" presets if it's early morning (likely catching up from yesterday)
  if (isEarlyMorning) {
    dynamicPresets.push({
      label: "Yesterday Full Day (9am-5pm)",
      startTime: "09:00",
      endTime: "17:00",
      hours: 8,
      date: yesterday,
      isDynamic: true
    });
  }
  
  // Add "This Morning" preset if it's afternoon (catching up from earlier today)
  if (!isEarlyMorning) {
    dynamicPresets.push({
      label: "This Morning (9am-12pm)",
      startTime: "09:00",
      endTime: "12:00",
      hours: 3,
      date: now,
      isDynamic: true
    });
  }
  
  return [...dynamicPresets, ...staticPresets];
};

// Keep the old export for backward compatibility
export const TIME_PRESETS: TimePreset[] = getTimePresets();