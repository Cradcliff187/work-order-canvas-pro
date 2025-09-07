import { useState, useCallback } from 'react';
import { 
  getCurrentLocationCached as getLocationCached, 
  getAddressFromLocationCached as getAddressCached,
  clearLocationCache as clearCache,
  type LocationData 
} from '@/services/locationService';


interface LocationTrackingReturn {
  getCurrentLocationCached: () => Promise<LocationData | null>;
  getAddressFromLocationCached: (location: LocationData) => Promise<string | null>;
  clearLocationCache: () => void;
  isLocationLoading: boolean;
  lastLocationUpdate: Date | null;
}

export function useLocationTracking(): LocationTrackingReturn {
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

  const getCurrentLocationCached = useCallback(async (): Promise<LocationData | null> => {
    setIsLocationLoading(true);
    try {
      const location = await getLocationCached();
      if (location) {
        setLastLocationUpdate(new Date());
      }
      return location;
    } catch {
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  const getAddressFromLocationCached = useCallback(async (location: LocationData): Promise<string | null> => {
    try {
      return await getAddressCached(location);
    } catch {
      return null;
    }
  }, []);

  const clearLocationCache = useCallback(() => {
    clearCache();
    setLastLocationUpdate(null);
  }, []);

  return {
    getCurrentLocationCached,
    getAddressFromLocationCached,
    clearLocationCache,
    isLocationLoading,
    lastLocationUpdate
  };
}