export interface StructuredAddress {
  location_street_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_zip_code?: string | null;
  // Legacy fallback fields
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}

export interface LocationDisplay {
  location_name?: string | null;
  store_location?: string | null;
  partner_location_number?: string | null;
}

/**
 * Formats a structured address into a single-line display string
 */
export function formatAddress(address: StructuredAddress): string {
  // Use structured fields first, fallback to legacy fields
  const street = address.location_street_address || address.street_address;
  const city = address.location_city || address.city;
  const state = address.location_state || address.state;
  const zipCode = address.location_zip_code || address.zip_code;

  const parts: string[] = [];
  
  if (street) parts.push(street);
  if (city) parts.push(city);
  if (state) {
    if (zipCode) {
      parts.push(`${state} ${zipCode}`);
    } else {
      parts.push(state);
    }
  } else if (zipCode) {
    parts.push(zipCode);
  }

  return parts.join(', ');
}

/**
 * Formats a structured address into multi-line display
 */
export function formatAddressMultiline(address: StructuredAddress): string[] {
  const street = address.location_street_address || address.street_address;
  const city = address.location_city || address.city;
  const state = address.location_state || address.state;
  const zipCode = address.location_zip_code || address.zip_code;

  const lines: string[] = [];
  
  if (street) lines.push(street);
  
  const cityStateZip: string[] = [];
  if (city) cityStateZip.push(city);
  if (state && zipCode) {
    cityStateZip.push(`${state} ${zipCode}`);
  } else if (state) {
    cityStateZip.push(state);
  } else if (zipCode) {
    cityStateZip.push(zipCode);
  }
  
  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(', '));
  }

  return lines;
}

/**
 * Checks if an address has any data
 */
export function hasAddress(address: StructuredAddress): boolean {
  return !!(
    address.location_street_address || address.street_address ||
    address.location_city || address.city ||
    address.location_state || address.state ||
    address.location_zip_code || address.zip_code
  );
}

/**
 * Formats location display for work order tables (compact format like "Loc: 504")
 */
export function formatLocationDisplay(location: LocationDisplay & StructuredAddress): string {
  // When both partner location number and store location exist, combine them
  if (location.partner_location_number && location.store_location) {
    const combined = `${location.partner_location_number} - ${location.store_location}`;
    return combined.length > 30 ? `${combined.substring(0, 27)}...` : combined;
  }
  
  // Fallback to individual fields
  if (location.partner_location_number) {
    return `Loc: ${location.partner_location_number}`;
  }
  if (location.store_location) {
    return location.store_location;
  }
  if (location.location_name) {
    return location.location_name;
  }
  
  // Fallback to first part of address
  const address = formatAddress(location);
  if (address) {
    const firstPart = address.split(',')[0];
    return firstPart.length > 30 ? `${firstPart.substring(0, 27)}...` : firstPart;
  }
  
  return 'N/A';
}

/**
 * Generates Google Maps URL from structured address
 */
export function generateMapUrl(address: StructuredAddress): string | null {
  const formattedAddress = formatAddress(address);
  if (!formattedAddress) return null;
  
  const encodedAddress = encodeURIComponent(formattedAddress);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
}

/**
 * Formats location tooltip content with full address details
 */
export function formatLocationTooltip(location: LocationDisplay & StructuredAddress): string {
  const parts: string[] = [];
  
  // Add location identifiers
  if (location.store_location) parts.push(`Store: ${location.store_location}`);
  if (location.partner_location_number) parts.push(`Loc #: ${location.partner_location_number}`);
  if (location.location_name) parts.push(`Name: ${location.location_name}`);
  
  // Add address
  const address = formatAddress(location);
  if (address) {
    if (parts.length > 0) parts.push(''); // Empty line separator
    parts.push(address);
  }
  
  return parts.join('\n');
}