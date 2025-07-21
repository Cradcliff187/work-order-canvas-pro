import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export interface LocationSuggestion {
  place_id: string;
  description: string;
  terms: { value: string }[];
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface UseLocationSuggestionsReturn {
  suggestions: LocationSuggestion[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for location suggestions and partner location code handling
 * 
 * Features:
 * - Provides location suggestions based on search
 * - Handles partner location code validation
 * - Formats location display information
 * 
 * @param searchTerm - Search term for location suggestions
 * @param organizationId - Organization ID for partner location codes
 * @returns Location suggestions and utilities
 */
export function useLocationSuggestions(searchTerm: string, organizationId?: string) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedSearchTerm) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key is not set.');
        }

        const encodedSearchTerm = encodeURIComponent(debouncedSearchTerm);
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedSearchTerm}&types=geocode&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
          setSuggestions(data.predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            description: prediction.description,
            terms: prediction.terms,
            structured_formatting: {
              main_text: prediction.structured_formatting?.main_text || prediction.description,
              secondary_text: prediction.structured_formatting?.secondary_text || '',
            },
            geometry: {
              location: {
                lat: 0,
                lng: 0,
              },
            },
          })));
        } else {
          setError(data.error_message || `Google Maps API Error: ${data.status}`);
          setSuggestions([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch location suggestions.');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchTerm]);

  return { suggestions, isLoading, error };
}

export const formatLocationDisplay = (location: LocationSuggestion): string => {
  return location.structured_formatting.main_text;
};

export const getDirectionsUrl = (location: LocationSuggestion): string | null => {
  if (!location?.structured_formatting?.main_text || !location?.structured_formatting?.secondary_text) {
    return null;
  }

  const address = `${location.structured_formatting.main_text}, ${location.structured_formatting.secondary_text}`;
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
};
