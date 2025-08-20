import { useState, useCallback } from 'react';
import { useLocation } from '@/hooks/useLocation';
import type { CachedLocationData } from './types';

// Use the LocationData type from useLocation hook
type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

const LOCATION_CACHE_KEY = 'clock_location_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  const { getCurrentLocation, getAddressFromLocation } = useLocation();

  const getCachedLocation = useCallback((): CachedLocationData | null => {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedLocationData = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
      
      if (isExpired) {
        localStorage.removeItem(LOCATION_CACHE_KEY);
        return null;
      }
      
      return data;
    } catch {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedLocation = useCallback((location: LocationData, address: string): void => {
    try {
      const cacheData: CachedLocationData = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        address,
        timestamp: Date.now()
      };
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
      setLastLocationUpdate(new Date());
    } catch {
      // Silently fail if localStorage is not available
    }
  }, []);

  const getCurrentLocationCached = useCallback(async (): Promise<LocationData | null> => {
    // Check cache first
    const cached = getCachedLocation();
    if (cached) {
      // Convert cached simple location back to LocationData format
      return {
        latitude: cached.location.latitude,
        longitude: cached.location.longitude,
        accuracy: 0, // We don't cache accuracy
        timestamp: cached.timestamp
      };
    }

    setIsLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        // Get address and cache both location and address
        try {
          const address = await getAddressFromLocation(location);
          const addressString = address?.street ? 
            `${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : 
            'Location captured';
          setCachedLocation(location, addressString);
        } catch {
          // Cache location without address if geocoding fails
          setCachedLocation(location, 'Location captured');
        }
        
        return location;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  }, [getCachedLocation, getCurrentLocation, getAddressFromLocation, setCachedLocation]);

  const getAddressFromLocationCached = useCallback(async (location: LocationData): Promise<string | null> => {
    // Check cache first
    const cached = getCachedLocation();
    if (cached && 
        Math.abs(cached.location.latitude - location.latitude) < 0.0001 &&
        Math.abs(cached.location.longitude - location.longitude) < 0.0001) {
      return cached.address;
    }

    try {
      const address = await getAddressFromLocation(location);
      const addressString = address?.street ? 
        `${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : 
        'Location captured';
      
      setCachedLocation(location, addressString);
      return addressString;
    } catch {
      return null;
    }
  }, [getCachedLocation, getAddressFromLocation, setCachedLocation]);

  const clearLocationCache = useCallback(() => {
    localStorage.removeItem(LOCATION_CACHE_KEY);
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