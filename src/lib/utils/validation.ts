/**
 * UUID validation utilities to prevent NULL UUID conversion errors
 */

// RFC 4122 compliant UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  
  return UUID_REGEX.test(value);
}

/**
 * Safely converts a value to UUID string, returning null for invalid UUIDs
 */
export function sanitizeUUID(value: unknown): string | null {
  if (isValidUUID(value)) {
    return value;
  }
  
  return null;
}

/**
 * Filters an array to only include valid UUIDs
 */
export function filterValidUUIDs(values: unknown[]): string[] {
  return values.filter(isValidUUID);
}

/**
 * Validates an array of UUIDs and logs warnings for invalid ones
 */
export function validateUUIDArray(values: unknown[], context = 'UUID validation'): string[] {
  const validUUIDs: string[] = [];
  const invalidValues: unknown[] = [];
  
  values.forEach(value => {
    if (isValidUUID(value)) {
      validUUIDs.push(value);
    } else {
      invalidValues.push(value);
    }
  });
  
  if (invalidValues.length > 0) {
    console.warn(`${context}: Found ${invalidValues.length} invalid UUID(s):`, invalidValues);
  }
  
  return validUUIDs;
}

/**
 * Safe UUID lookup that prevents NULL conversion errors
 */
export function safeUUIDLookup<T>(
  map: Map<string, T>, 
  uuid: unknown, 
  fallback: T | null = null
): T | null {
  if (!isValidUUID(uuid)) {
    return fallback;
  }
  
  return map.get(uuid) || fallback;
}