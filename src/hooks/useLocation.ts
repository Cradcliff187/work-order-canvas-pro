import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: number;
}

export interface AddressComponents {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

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
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      setCurrentLocation(locationData);
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

  const reverseGeocode = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<AddressComponents | null> => {
    try {
      // Using a free geocoding service (you might want to use a more robust solution)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      return {
        street: data.locality || '',
        city: data.city || data.principalSubdivision || '',
        state: data.principalSubdivisionCode || '',
        zipCode: data.postcode || '',
        country: data.countryName || ''
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }, []);

  const getAddressFromLocation = useCallback(async (
    location?: LocationData
  ): Promise<AddressComponents | null> => {
    const loc = location || currentLocation;
    if (!loc) return null;

    return reverseGeocode(loc.latitude, loc.longitude);
  }, [currentLocation, reverseGeocode]);

  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }, []);

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

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
    const destination = latitude && longitude 
      ? `${latitude},${longitude}`
      : encodeURIComponent(destinationAddress);
    
    // Detect platform and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let url: string;
    
    if (isIOS) {
      url = `maps://maps.google.com/maps?daddr=${destination}`;
    } else if (isAndroid) {
      url = `google.navigation:q=${destination}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    }
    
    window.open(url, '_blank');
  }, []);

  return {
    isSupported,
    currentLocation,
    isLoading,
    getCurrentLocation,
    reverseGeocode,
    getAddressFromLocation,
    calculateDistance,
    getDistanceToWorkSite,
    openDirections
  };
}