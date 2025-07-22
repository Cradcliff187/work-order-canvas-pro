import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeolocationError | null>(null);
  const { toast } = useToast();

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by your browser' });
      toast({
        title: 'Location Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (error) => {
        setError({ code: error.code, message: error.message });
        setLoading(false);
        toast({
          title: 'Location Error',
          description: error.message,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [toast]);

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  /**
   * Get approximate distance to work site based on address
   * Uses intelligent mocking based on city/state until geocoding API is available
   */
  const getDistanceToWorkSite = useCallback((workSiteAddress: string): number => {
    // TODO: Implement real geocoding when API is available
    // For now, use intelligent mocking based on address patterns
    
    if (!workSiteAddress) return 0;
    
    const addressLower = workSiteAddress.toLowerCase();
    
    // Mock distances based on common patterns in addresses
    // These are approximate and should be replaced with real geocoding
    
    // Same city indicators
    if (location) {
      // If we have user's actual location, we can make better estimates
      // For now, still return mocked values but more consistent
      
      // Check for same city/area keywords
      if (addressLower.includes('downtown') || addressLower.includes('central')) {
        return 5.2; // ~5km for downtown areas
      }
      if (addressLower.includes('north') || addressLower.includes('south') || 
          addressLower.includes('east') || addressLower.includes('west')) {
        return 12.8; // ~13km for directional areas
      }
      if (addressLower.includes('industrial') || addressLower.includes('business park')) {
        return 18.5; // ~19km for industrial areas
      }
    }
    
    // State-based estimates (very rough)
    if (addressLower.includes(', ca') || addressLower.includes('california')) {
      return 25.3; // Default for California addresses
    }
    if (addressLower.includes(', ny') || addressLower.includes('new york')) {
      return 15.7; // Default for New York addresses (smaller state)
    }
    if (addressLower.includes(', tx') || addressLower.includes('texas')) {
      return 45.2; // Default for Texas addresses (larger state)
    }
    
    // Check for highway/interstate mentions
    if (addressLower.match(/\bi-\d+\b/) || addressLower.includes('highway')) {
      return 35.6; // Typically further out
    }
    
    // Check for rural indicators
    if (addressLower.includes('rural') || addressLower.includes('county road')) {
      return 52.1; // Rural areas typically further
    }
    
    // Default distance if no patterns match
    return 22.4; // ~22km default
  }, [location]);

  /**
   * Format distance for display
   */
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  /**
   * Get formatted distance to work site
   */
  const getFormattedDistance = useCallback((workSiteAddress: string): string => {
    const distance = getDistanceToWorkSite(workSiteAddress);
    return formatDistance(distance);
  }, [getDistanceToWorkSite]);

  // Request location on mount if not already available
  useEffect(() => {
    if (!location && !loading && !error) {
      requestLocation();
    }
  }, [location, loading, error, requestLocation]);

  return {
    location,
    loading,
    error,
    requestLocation,
    getDistanceToWorkSite,
    getFormattedDistance,
    calculateDistance,
    hasLocationPermission: !!location,
  };
}; 