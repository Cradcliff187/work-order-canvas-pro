/**
 * Centralized location service for GPS, geocoding, and caching functionality
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AddressComponents {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface CachedLocationData {
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  timestamp: number;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface ClockLocationData {
  location_lat: number;
  location_lng: number;
  location_address: string;
}

export interface ClockOutLocationData {
  clock_out_location_lat: number;
  clock_out_location_lng: number;
  clock_out_location_address: string;
}

// Cache configuration
const LOCATION_CACHE_KEY = 'clock_location_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get current GPS location
 */
export async function getCurrentLocation(
  options: LocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000 // 5 minutes
  }
): Promise<LocationData | null> {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation not supported');
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  } catch (error) {
    console.error('Location error:', error);
    return null;
  }
}

/**
 * Get formatted address from coordinates using reverse geocoding
 */
export async function getAddressFromCoords(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Format address as a readable string
    const street = data.locality || '';
    const city = data.city || data.principalSubdivision || '';
    const state = data.principalSubdivisionCode || '';
    const zipCode = data.postcode || '';
    
    if (street && city && state) {
      return `${street}, ${city}, ${state} ${zipCode}`.trim();
    } else if (city && state) {
      return `${city}, ${state}`.trim();
    } else if (city) {
      return city;
    } else {
      return 'Location captured';
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get detailed address components from coordinates
 */
export async function getAddressComponents(
  latitude: number,
  longitude: number
): Promise<AddressComponents | null> {
  try {
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
}

/**
 * Cache location data in localStorage
 */
export function cacheLocation(location: LocationData, address: string): void {
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
  } catch (error) {
    console.error('Failed to cache location:', error);
  }
}

/**
 * Get cached location data if valid
 */
export function getCachedLocation(): CachedLocationData | null {
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
  } catch (error) {
    console.error('Failed to get cached location:', error);
    localStorage.removeItem(LOCATION_CACHE_KEY);
    return null;
  }
}

/**
 * Clear location cache
 */
export function clearLocationCache(): void {
  localStorage.removeItem(LOCATION_CACHE_KEY);
}

/**
 * Get current location with caching
 */
export async function getCurrentLocationCached(): Promise<LocationData | null> {
  // Check cache first
  const cached = getCachedLocation();
  if (cached) {
    return {
      latitude: cached.location.latitude,
      longitude: cached.location.longitude,
      accuracy: 0, // We don't cache accuracy
      timestamp: cached.timestamp
    };
  }

  // Get fresh location
  const location = await getCurrentLocation();
  if (location) {
    // Get address and cache both
    const address = await getAddressFromCoords(location.latitude, location.longitude);
    cacheLocation(location, address || 'Location captured');
  }
  
  return location;
}

/**
 * Get address from location with caching
 */
export async function getAddressFromLocationCached(location: LocationData): Promise<string | null> {
  // Check cache first
  const cached = getCachedLocation();
  if (cached && 
      Math.abs(cached.location.latitude - location.latitude) < 0.0001 &&
      Math.abs(cached.location.longitude - location.longitude) < 0.0001) {
    return cached.address;
  }

  // Get fresh address
  const address = await getAddressFromCoords(location.latitude, location.longitude);
  if (address) {
    cacheLocation(location, address);
  }
  
  return address;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate location data
 */
export function validateLocationData(location: any): location is LocationData {
  return (
    location &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    typeof location.accuracy === 'number' &&
    typeof location.timestamp === 'number' &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  );
}

/**
 * Format location data for database insertion (clock-in)
 */
export function formatLocationForClockIn(
  location: LocationData,
  address: string
): ClockLocationData {
  return {
    location_lat: location.latitude,
    location_lng: location.longitude,
    location_address: address
  };
}

/**
 * Format location data for database insertion (clock-out)
 */
export function formatLocationForClockOut(
  location: LocationData,
  address: string
): ClockOutLocationData {
  return {
    clock_out_location_lat: location.latitude,
    clock_out_location_lng: location.longitude,
    clock_out_location_address: address
  };
}

/**
 * Open device's native map application with directions
 */
export function openDirections(
  destinationAddress: string,
  latitude?: number,
  longitude?: number
): void {
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
}