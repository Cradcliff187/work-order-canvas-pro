
import { US_STATES } from '@/constants/states';

/**
 * Format phone number to (555) 123-4567 format
 * Handles 10-digit US numbers, strips country code if present
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 11-digit numbers (with country code 1)
  const cleanDigits = digits.length === 11 && digits.startsWith('1') 
    ? digits.slice(1) 
    : digits;
  
  // Format 10-digit numbers
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  
  // Return original if invalid length
  return phone;
}

/**
 * Format email to lowercase and trimmed
 */
export function formatEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  return email.trim().toLowerCase();
}

/**
 * Format ZIP code to 12345 or 12345-6789 format
 * Handles both 5-digit and 9-digit ZIP codes
 */
export function formatZipCode(zip: string | null | undefined): string {
  if (!zip) return '';
  
  // Remove all non-digits and hyphens, then remove hyphens to get clean digits
  const digits = zip.replace(/[^0-9-]/g, '').replace(/-/g, '');
  
  // Handle 5-digit ZIP
  if (digits.length === 5) {
    return digits;
  }
  
  // Handle 9-digit ZIP+4
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  
  // Return original if invalid format
  return zip;
}

/**
 * Format state to uppercase 2-letter code
 * Validates against US_STATES constant
 */
export function formatState(state: string | null | undefined): string {
  if (!state) return '';
  
  const upperState = state.trim().toUpperCase();
  
  // Validate against known states
  const validState = US_STATES.find(s => s.value === upperState);
  return validState ? upperState : state;
}

/**
 * Format street address to proper case with standard abbreviations
 */
export function formatStreetAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  const trimmed = address.trim();
  
  // Standard abbreviations map
  const abbreviations: Record<string, string> = {
    'street': 'St',
    'avenue': 'Ave',
    'boulevard': 'Blvd',
    'drive': 'Dr',
    'court': 'Ct',
    'circle': 'Cir',
    'lane': 'Ln',
    'road': 'Rd',
    'place': 'Pl',
    'square': 'Sq',
    'terrace': 'Ter',
    'north': 'N',
    'south': 'S',
    'east': 'E',
    'west': 'W',
    'northeast': 'NE',
    'northwest': 'NW',
    'southeast': 'SE',
    'southwest': 'SW',
    'apartment': 'Apt',
    'suite': 'Ste',
    'unit': 'Unit',
    'building': 'Bldg',
    'floor': 'Fl'
  };
  
  // Convert to proper case
  const properCase = trimmed.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  
  // Apply abbreviations
  let formatted = properCase;
  Object.entries(abbreviations).forEach(([full, abbrev]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    formatted = formatted.replace(regex, abbrev);
  });
  
  return formatted;
}

/**
 * Format city name to proper case
 * Handles special cases like McDonald, O'Brien, etc.
 */
export function formatCity(city: string | null | undefined): string {
  if (!city) return '';
  
  const trimmed = city.trim();
  
  // Convert to proper case
  let formatted = trimmed.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  
  // Handle special cases
  const specialCases: Record<string, RegExp> = {
    'Mc': /\bMc([a-z])/g,
    'Mac': /\bMac([a-z])/g,
    'O\'': /\bO\'([a-z])/g,
    'St.': /\bSt\.?\s/g,
    'Mt.': /\bMt\.?\s/g,
    'Ft.': /\bFt\.?\s/g,
    'Dr.': /\bDr\.?\s/g
  };
  
  Object.entries(specialCases).forEach(([replacement, regex]) => {
    if (replacement.includes('(')) {
      // Handle patterns with capture groups
      formatted = formatted.replace(regex, (match, p1) => {
        return replacement.replace('([a-z])', p1.toUpperCase());
      });
    } else {
      // Handle simple replacements
      formatted = formatted.replace(regex, replacement);
    }
  });
  
  return formatted;
}

/**
 * Format currency amount with proper locale formatting
 * Handles null, undefined, and zero values gracefully
 */
export function formatCurrency(amount: number | null | undefined, showZero: boolean = false): string {
  if (amount === null || amount === undefined) {
    return '—';
  }
  
  if (amount === 0 && !showZero) {
    return '—';
  }
  
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
