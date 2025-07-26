/**
 * Mobile platform detection utilities
 */

/**
 * Detects if the current device is running iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Detects if the current device is running Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Detects if the current browser is running on a mobile device
 */
export const isMobileBrowser = (): boolean => {
  return isIOS() || isAndroid() || /Mobile|Tablet/.test(navigator.userAgent);
};

/**
 * Detects if the current device is running a mobile OS (iOS or Android)
 */
export const isMobileOS = (): boolean => {
  return isIOS() || isAndroid();
};

/**
 * Returns the platform name as a string
 */
export const getPlatformName = (): 'ios' | 'android' | 'desktop' => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
};

/**
 * Returns the appropriate capture attribute value for camera inputs based on the platform
 * iOS prefers 'camera' (front camera), Android prefers 'environment' (rear camera)
 */
export const getCameraAttribute = (): string | null => {
  if (isIOS()) {
    return 'camera';  // iOS prefers front camera first
  } else if (isAndroid()) {
    return 'environment';  // Android prefers rear camera
  }
  return null;  // Desktop/other platforms - no capture attribute
};

/**
 * Checks if the platform supports native camera input
 */
export const supportsNativeCamera = (): boolean => {
  return isMobileOS() && 'getUserMedia' in navigator.mediaDevices;
};