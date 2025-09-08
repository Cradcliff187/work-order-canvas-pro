import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { formatAddress } from '@/lib/utils/addressUtils';
import { cn } from '@/lib/utils';

interface StaticMapThumbnailProps {
  address: {
    location_street_address?: string | null;
    location_city?: string | null;
    location_state?: string | null;
    location_zip_code?: string | null;
    street_address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function StaticMapThumbnail({ 
  address, 
  className,
  size = 'md',
  onClick 
}: StaticMapThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formattedAddress = formatAddress(address);
  
  if (!formattedAddress || formattedAddress === 'N/A') {
    return null;
  }

  const dimensions = {
    sm: { width: 100, height: 80 },
    md: { width: 150, height: 100 },
    lg: { width: 200, height: 150 }
  };

  const { width, height } = dimensions[size];
  
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(formattedAddress)}&zoom=15&size=${width}x${height}&markers=${encodeURIComponent(formattedAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

  if (imageError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    // Fallback to address text
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-md border border-border bg-muted text-muted-foreground text-xs p-2",
          size === 'sm' && "w-[100px] h-[80px]",
          size === 'md' && "w-[150px] h-[100px]", 
          size === 'lg' && "w-[200px] h-[150px]",
          onClick && "cursor-pointer hover:bg-muted/80",
          className
        )}
        onClick={onClick}
      >
        <div className="text-center">
          <MapPin className="h-4 w-4 mx-auto mb-1" />
          <div className="leading-tight">{formattedAddress}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative rounded-md overflow-hidden border border-border bg-muted",
        size === 'sm' && "w-[100px] h-[80px]",
        size === 'md' && "w-[150px] h-[100px]",
        size === 'lg' && "w-[200px] h-[150px]",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <img
        src={mapUrl}
        alt={`Map of ${formattedAddress}`}
        className={cn(
          "w-full h-full object-cover transition-opacity",
          !imageLoaded && "opacity-0"
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      {imageLoaded && (
        <div className="absolute bottom-1 right-1 bg-background/80 rounded px-1 py-0.5">
          <MapPin className="h-3 w-3 text-primary" />
        </div>
      )}
    </div>
  );
}