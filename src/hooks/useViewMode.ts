import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ViewMode = 'table' | 'card' | 'list';
export type DeviceType = 'mobile' | 'desktop';

export interface ViewModeConfig {
  mobile: ViewMode[];
  desktop: ViewMode[];
}

interface UseViewModeOptions {
  componentKey: string;
  config: ViewModeConfig;
  defaultMode?: ViewMode;
}

interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  isAllowed: (mode: ViewMode) => boolean;
}

export function useViewMode({
  componentKey,
  config,
  defaultMode = 'table'
}: UseViewModeOptions): UseViewModeReturn {
  const isMobile = useIsMobile();
  const deviceType: DeviceType = isMobile ? 'mobile' : 'desktop';
  const allowedModes = config[deviceType];
  
  const storageKey = `view-mode-${componentKey}`;
  
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && allowedModes.includes(stored as ViewMode)) {
        return stored as ViewMode;
      }
    } catch (error) {
      console.warn('Failed to read view mode from localStorage:', error);
    }
    
    // Auto-switch to appropriate view on mobile
    if (isMobile && allowedModes.includes('list')) {
      return 'list';
    }
    
    // Use first allowed mode or default
    return allowedModes.includes(defaultMode) ? defaultMode : allowedModes[0];
  });

  const setViewMode = (mode: ViewMode) => {
    if (!allowedModes.includes(mode)) {
      console.warn(`View mode "${mode}" is not allowed for ${deviceType}`);
      return;
    }
    
    setViewModeState(mode);
    
    try {
      localStorage.setItem(storageKey, mode);
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error);
    }
  };

  const isAllowed = (mode: ViewMode): boolean => {
    return allowedModes.includes(mode);
  };

  // Auto-switch when device type changes
  useEffect(() => {
    const currentAllowedModes = config[deviceType];
    
    if (!currentAllowedModes.includes(viewMode)) {
      // Current mode not allowed on this device, switch to appropriate mode
      let newMode: ViewMode;
      
      if (isMobile && currentAllowedModes.includes('list')) {
        newMode = 'list';
      } else {
        newMode = currentAllowedModes.includes(defaultMode) 
          ? defaultMode 
          : currentAllowedModes[0];
      }
      
      setViewModeState(newMode);
      
      try {
        localStorage.setItem(storageKey, newMode);
      } catch (error) {
        console.warn('Failed to save view mode to localStorage:', error);
      }
    }
  }, [isMobile, deviceType, config, defaultMode, storageKey, viewMode]);

  return {
    viewMode,
    setViewMode,
    allowedModes,
    isAllowed
  };
}