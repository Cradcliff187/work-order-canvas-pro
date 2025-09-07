import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getCurrentLocation as getLocation,
  getAddressComponents as reverseGeocode,
  calculateDistance as calcDistance,
  openDirections as openMaps,
  type LocationData,
  type AddressComponents
} from '@/services/locationService';

// Re-export types for backward compatibility
export type { LocationData, AddressComponents } from '@/services/locationService';

export function useLocation() {
  const [isSupported] = useState(() => 'geolocation' in navigator);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentLocation = useCallback(async (
    options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  ): Promise<LocationData | null> => {
    if (!isSupported) {
      toast({
        title: "Location Not Supported",
        description: "Your device doesn't support location services.",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);

    try {
      const locationData = await getLocation(options);
      if (locationData) {
        setCurrentLocation(locationData);
      }
      return locationData;
    } catch (error) {
      console.error('Location error:', error);
      
      let message = "Unable to get your location.";
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out.";
            break;
        }
      }

      toast({
        title: "Location Error",
        description: message,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  const reverseGeocodeWrapper = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<AddressComponents | null> => {
    return reverseGeocode(latitude, longitude);
  }, []);

  const getAddressFromLocation = useCallback(async (
    location?: LocationData
  ): Promise<AddressComponents | null> => {
    const loc = location || currentLocation;
    if (!loc) return null;

    return reverseGeocodeWrapper(loc.latitude, loc.longitude);
  }, [currentLocation, reverseGeocodeWrapper]);

  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    return calcDistance(lat1, lon1, lat2, lon2);
  }, []);

  const getDistanceToWorkSite = useCallback(async (
    workSiteAddress: string
  ): Promise<number | null> => {
    if (!currentLocation) {
      const location = await getCurrentLocation();
      if (!location) return null;
    }

    // In a real implementation, you'd geocode the work site address
    // For now, this is a placeholder that returns a mock distance
    try {
      // Mock calculation - in reality you'd geocode the address first
      return Math.random() * 50; // Random distance up to 50km
    } catch (error) {
      console.error('Distance calculation error:', error);
      return null;
    }
  }, [currentLocation, getCurrentLocation]);

  const openDirections = useCallback((
    destinationAddress: string,
    latitude?: number,
    longitude?: number
  ) => {
    openMaps(destinationAddress, latitude, longitude);
  }, []);

  return {
    isSupported,
    currentLocation,
    isLoading,
    getCurrentLocation,
    reverseGeocode: reverseGeocodeWrapper,
    getAddressFromLocation,
    calculateDistance,
    getDistanceToWorkSite,
    openDirections
  };
}